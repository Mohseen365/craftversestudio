import { prisma } from "./prisma";
import { toDateOnly, addDays } from "./utils";
import { DAILY_PRODUCTION_CAPACITY } from "./capacity";

export interface ScheduledAllocation {
  date: Date;
  quantity: number;
}

export interface OrderScheduleInput {
  id: string;
  orderNumber: string;
  productionDeadline: Date;
  requiredCapacity: number;
  lockedCapacity: number;
  status: string;
}

/**
 * Runs the scheduling algorithm in-memory to see if all orders can fit.
 */
export function scheduleOrdersInMemory(
  today: Date,
  orders: OrderScheduleInput[],
  capacityLimits: Map<string, number>
): {
  success: boolean;
  allocations: Map<string, ScheduledAllocation[]>;
  reason?: string;
} {
  const futureAllocations = new Map<string, ScheduledAllocation[]>();
  const consumedCapacity = new Map<string, number>();

  const getRemainingCapacity = (dateStr: string) => {
    const limit = capacityLimits.get(dateStr) ?? DAILY_PRODUCTION_CAPACITY;
    const consumed = consumedCapacity.get(dateStr) ?? 0;
    return Math.max(0, limit - consumed);
  };

  // Calculate remaining needs and constraints for all orders
  const ordersToSchedule = orders
    .map((order) => {
      const remainingToSchedule = order.requiredCapacity - order.lockedCapacity;
      if (remainingToSchedule <= 0) {
        return null;
      }

      const deadline = toDateOnly(order.productionDeadline);
      const availableDates: Date[] = [];
      let current = addDays(today, 1);
      while (current <= deadline) {
        availableDates.push(new Date(current));
        current = addDays(current, 1);
      }

      const availableDays = availableDates.length;
      const slack = availableDays - remainingToSchedule;

      return {
        order,
        remainingToSchedule,
        availableDates,
        availableDays,
        slack,
      };
    })
    .filter((o): o is NonNullable<typeof o> => o !== null);

  // Sort orders by constraint:
  // 1. fewer possible dates (availableDays ASC)
  // 2. lower slack (slack ASC)
  // 3. earlier deadlines (deadline ASC)
  ordersToSchedule.sort((a, b) => {
    if (a.availableDays !== b.availableDays) {
      return a.availableDays - b.availableDays;
    }
    if (a.slack !== b.slack) {
      return a.slack - b.slack;
    }
    return (
      a.order.productionDeadline.getTime() -
      b.order.productionDeadline.getTime()
    );
  });

  // Allocate backwards from deadline to today + 1
  for (const {
    order,
    remainingToSchedule,
    availableDates,
  } of ordersToSchedule) {
    let needed = remainingToSchedule;
    const orderAllocations: ScheduledAllocation[] = [];

    for (let i = availableDates.length - 1; i >= 0; i--) {
      if (needed <= 0) break;
      const date = availableDates[i];
      const dateStr = date.toISOString().split("T")[0];
      const remainingCap = getRemainingCapacity(dateStr);

      if (remainingCap > 0) {
        const allocate = Math.min(needed, remainingCap);
        consumedCapacity.set(
          dateStr,
          (consumedCapacity.get(dateStr) ?? 0) + allocate
        );
        orderAllocations.push({ date, quantity: allocate });
        needed -= allocate;
      }
    }

    if (needed > 0) {
      return {
        success: false,
        allocations: new Map(),
        reason: `Order ${order.orderNumber} (ID: ${
          order.id
        }) cannot be completed before its deadline (${
          order.productionDeadline.toISOString().split("T")[0]
        }). Missing ${needed} capacity units.`,
      };
    }

    futureAllocations.set(order.id, orderAllocations);
  }

  return {
    success: true,
    allocations: futureAllocations,
  };
}

/**
 * Prepares scheduling data by fetching existing orders and locked capacity.
 */
export async function getSchedulerData(today: Date) {
  // Fetch all active/uncompleted orders that are scheduled or need scheduling
  const orders = await prisma.order.findMany({
    where: {
      status: {
        in: [
          "ACCEPTED",
          "PAYMENT_PENDING",
          "PAYMENT_SUBMITTED",
          "PAYMENT_VERIFICATION",
          "PAYMENT_REJECTED",
          "CONFIRMED",
          "IN_PRODUCTION",
          "READY_TO_SHIP",
        ],
      },
      productionDeadline: {
        not: null,
      },
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              productionDays: true,
            },
          },
        },
      },
      capacityReservations: {
        include: {
          capacity: true,
        },
      },
    },
  });

  // Fetch all Capacity records to know limits for specific days
  const capacities = await prisma.capacity.findMany();
  const capacityLimits = new Map<string, number>();
  for (const cap of capacities) {
    const dateStr = toDateOnly(cap.date).toISOString().split("T")[0];
    capacityLimits.set(dateStr, cap.maximumCapacity);
  }

  const inputs: OrderScheduleInput[] = orders.map((order) => {
    const requiredCapacity = order.items.reduce(
      (sum, item) =>
        sum + item.quantity * Math.max(1, item.product.productionDays),
      0
    );

    // Sum capacity already locked (date <= today)
    const lockedCapacity = order.capacityReservations
      .filter((res) => toDateOnly(res.capacity.date) <= today)
      .reduce((sum, res) => sum + res.quantity, 0);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      productionDeadline: order.productionDeadline!,
      requiredCapacity,
      lockedCapacity,
      status: order.status,
    };
  });

  return { inputs, capacityLimits };
}

/**
 * Checks if a candidate order can be accepted.
 */
export async function checkAcceptability(candidate: {
  id: string;
  orderNumber: string;
  productionDeadline: Date;
  requiredCapacity: number;
}) {
  const today = toDateOnly(new Date());
  const { inputs, capacityLimits } = await getSchedulerData(today);

  // Remove candidate if it already exists in inputs, and add the updated version
  const filteredInputs = inputs.filter((inp) => inp.id !== candidate.id);
  filteredInputs.push({
    id: candidate.id,
    orderNumber: candidate.orderNumber,
    productionDeadline: candidate.productionDeadline,
    requiredCapacity: candidate.requiredCapacity,
    lockedCapacity: 0, // Since it's a new order, it has no locked capacity
    status: "ACCEPTED",
  });

  const result = scheduleOrdersInMemory(today, filteredInputs, capacityLimits);

  if (!result.success) {
    return {
      canAccept: false,
      reason: result.reason,
      suggestedDates: [],
    };
  }

  // Find the allocations suggested for this candidate order
  const candidateAllocations = result.allocations.get(candidate.id) ?? [];
  return {
    canAccept: true,
    suggestedDates: candidateAllocations.map((alloc) => ({
      date: alloc.date.toISOString(),
      quantity: alloc.quantity,
    })),
  };
}

/**
 * Rebuilds the future capacity schedule in the database.
 */
export async function rebuildSchedule() {
  const today = toDateOnly(new Date());
  const { inputs, capacityLimits } = await getSchedulerData(today);

  const result = scheduleOrdersInMemory(today, inputs, capacityLimits);
  if (!result.success) {
    throw new Error(`Cannot rebuild schedule: ${result.reason}`);
  }

  // Database update transaction
  await prisma.$transaction(async (tx) => {
    // 1. Delete all future reservations (where capacity.date > today) for all active orders
    await tx.capacityReservation.deleteMany({
      where: {
        capacity: {
          date: {
            gt: today,
          },
        },
        order: {
          status: {
            in: [
              "ACCEPTED",
              "PAYMENT_PENDING",
              "PAYMENT_SUBMITTED",
              "PAYMENT_VERIFICATION",
              "PAYMENT_REJECTED",
              "CONFIRMED",
              "IN_PRODUCTION",
              "READY_TO_SHIP",
            ],
          },
        },
      },
    });

    // 2. Create/update Capacity records and insert the new reservations
    for (const [orderId, allocations] of result.allocations.entries()) {
      for (const alloc of allocations) {
        const dateOnly = toDateOnly(alloc.date);

        // Find or create the Capacity record for this date
        let capacity = await tx.capacity.findUnique({
          where: { date: dateOnly },
        });

        if (!capacity) {
          capacity = await tx.capacity.create({
            data: {
              date: dateOnly,
              maximumCapacity: DAILY_PRODUCTION_CAPACITY,
            },
          });
        }

        // Create the reservation
        await tx.capacityReservation.upsert({
          where: {
            capacityId_orderId: {
              capacityId: capacity.id,
              orderId,
            },
          },
          update: {
            quantity: alloc.quantity,
          },
          create: {
            capacityId: capacity.id,
            orderId,
            quantity: alloc.quantity,
          },
        });
      }
    }

    // 3. Remove any reservations for orders that are cancelled, refunded, rejected, shipped, or delivered on future dates (or all dates if they are fully cancelled)
    await tx.capacityReservation.deleteMany({
      where: {
        order: {
          status: {
            in: [
              "CANCELLED",
              "REFUNDED",
              "REJECTED",
              "SHIPPED",
              "DELIVERED",
              "PAYMENT_REJECTED",
            ],
          },
        },
        capacity: {
          date: {
            gt: today, // Future reservations are completely deleted. Past ones are locked.
          },
        },
      },
    });
  });
}

/**
 * Returns planning rows based on actual production dates instead of deadline dates.
 */
export async function getSchedulerPlanningRows(daysAhead = 60) {
  const today = toDateOnly(new Date());
  const end = addDays(today, daysAhead);

  const capacities = await prisma.capacity.findMany({
    where: {
      date: {
        gte: today,
        lte: end,
      },
    },
    include: {
      reservations: {
        include: {
          order: {
            include: {
              user: {
                select: {
                  name: true,
                  mobileNo: true,
                  email: true,
                  addresses: {
                    orderBy: { id: "desc" },
                    take: 1,
                  },
                },
              },
              items: {
                include: {
                  product: {
                    select: {
                      name: true,
                      productionDays: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  const capacityMap = new Map<string, (typeof capacities)[0]>();
  for (const cap of capacities) {
    capacityMap.set(toDateOnly(cap.date).toISOString(), cap);
  }

  const rows = [];
  // for (let i = 0; i <= daysAhead; i++) {
  //   const date = addDays(today, i);
  //   const key = date.toISOString();
  //   const capRecord = capacityMap.get(key);

  //   const maxCap = capRecord?.maximumCapacity ?? DAILY_PRODUCTION_CAPACITY;
  //   const reservations = capRecord?.reservations ?? [];
  //   const used = reservations.reduce((sum, res) => sum + res.quantity, 0);

  //   rows.push({
  //     date,
  //     dailyCapacity: maxCap,
  //     used,
  //     remaining: Math.max(0, maxCap - used),
  //     isFull: used >= maxCap,
  //     reservations: reservations.map((res) => ({
  //       id: res.id,
  //       quantity: res.quantity,
  //       order: res.order,
  //     })),
  //   });
  // }
  for (let i = 0; i <= daysAhead; i++) {
    const date = addDays(today, i);
    const key = toDateOnly(date).toISOString(); // normalize here too
    const capRecord = capacityMap.get(key);

    const maxCap = capRecord?.maximumCapacity ?? DAILY_PRODUCTION_CAPACITY;
    const reservations = capRecord?.reservations ?? [];
    const used = reservations.reduce((sum, res) => sum + res.quantity, 0);

    rows.push({
      date,
      dailyCapacity: maxCap,
      used,
      remaining: Math.max(0, maxCap - used),
      isFull: used >= maxCap,
      reservations: reservations.map((res) => ({
        id: res.id,
        quantity: res.quantity,
        order: res.order,
      })),
    });
  }

  return rows;
}
