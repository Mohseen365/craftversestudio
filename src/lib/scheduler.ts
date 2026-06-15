import { prisma } from "./prisma";
import { DAILY_PRODUCTION_CAPACITY } from "./capacity";

export function formatDateKey(date: Date, isUtc = false): string {
  const year = isUtc ? date.getUTCFullYear() : date.getFullYear();
  const month = String(
    (isUtc ? date.getUTCMonth() : date.getMonth()) + 1
  ).padStart(2, "0");
  const day = String(isUtc ? date.getUTCDate() : date.getDate()).padStart(
    2,
    "0"
  );
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDaysToKey(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKey(date, true);
}

export interface ScheduledAllocation {
  dateKey: string;
  quantity: number;
}

export interface OrderScheduleInput {
  id: string;
  orderNumber: string;
  productionDeadlineKey: string;
  requiredCapacity: number;
  lockedCapacity: number;
  status: string;
}

/**
 * Runs the scheduling algorithm in-memory using YYYY-MM-DD date keys.
 */
export function scheduleOrdersInMemory(
  todayKey: string,
  orders: OrderScheduleInput[],
  capacityLimits: Map<string, number>
): {
  success: boolean;
  allocations: Map<string, ScheduledAllocation[]>;
  reason?: string;
} {
  const futureAllocations = new Map<string, ScheduledAllocation[]>();
  const consumedCapacity = new Map<string, number>();

  const getRemainingCapacity = (dateKey: string) => {
    const limit = capacityLimits.get(dateKey) ?? DAILY_PRODUCTION_CAPACITY;
    const consumed = consumedCapacity.get(dateKey) ?? 0;
    return Math.max(0, limit - consumed);
  };

  // Calculate remaining needs and constraints for all orders
  const ordersToSchedule = orders
    .map((order) => {
      const remainingToSchedule = order.requiredCapacity - order.lockedCapacity;
      if (remainingToSchedule <= 0) {
        return null;
      }

      const availableDates: string[] = [];
      let currentKey = addDaysToKey(todayKey, 1);
      while (currentKey <= order.productionDeadlineKey) {
        availableDates.push(currentKey);
        currentKey = addDaysToKey(currentKey, 1);
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
  // 3. earlier deadlines (deadlineKey ASC)
  ordersToSchedule.sort((a, b) => {
    if (a.availableDays !== b.availableDays) {
      return a.availableDays - b.availableDays;
    }
    if (a.slack !== b.slack) {
      return a.slack - b.slack;
    }
    if (a.order.productionDeadlineKey < b.order.productionDeadlineKey)
      return -1;
    if (a.order.productionDeadlineKey > b.order.productionDeadlineKey) return 1;
    return 0;
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
      const dateKey = availableDates[i];
      const remainingCap = getRemainingCapacity(dateKey);

      if (remainingCap > 0) {
        const allocate = Math.min(needed, remainingCap);
        consumedCapacity.set(
          dateKey,
          (consumedCapacity.get(dateKey) ?? 0) + allocate
        );
        orderAllocations.push({ dateKey, quantity: allocate });
        needed -= allocate;
      }
    }

    if (needed > 0) {
      return {
        success: false,
        allocations: new Map(),
        reason: `Order ${order.orderNumber} (ID: ${order.id}) cannot be completed before its deadline (${order.productionDeadlineKey}). Missing ${needed} capacity units.`,
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
export async function getSchedulerData(todayKey: string) {
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
    const dateStr = formatDateKey(cap.date, true);
    capacityLimits.set(dateStr, cap.maximumCapacity);
  }

  const inputs: OrderScheduleInput[] = orders.map((order) => {
    const requiredCapacity = order.items.reduce(
      // (sum, item) => sum + item.quantity * Math.max(1, item.product.productionDays),
      (sum, item) => sum + item.quantity * item.product.productionDays,
      0
    );

    // Sum capacity already locked (dateKey <= todayKey)
    const lockedCapacity = order.capacityReservations
      .filter((res) => formatDateKey(res.capacity.date, true) <= todayKey)
      .reduce((sum, res) => sum + res.quantity, 0);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      productionDeadlineKey: formatDateKey(order.productionDeadline!, true),
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
  const todayKey = formatDateKey(new Date(), false);
  const { inputs, capacityLimits } = await getSchedulerData(todayKey);

  // Remove candidate if it already exists in inputs, and add the updated version
  const filteredInputs = inputs.filter((inp) => inp.id !== candidate.id);
  filteredInputs.push({
    id: candidate.id,
    orderNumber: candidate.orderNumber,
    productionDeadlineKey: formatDateKey(candidate.productionDeadline, true),
    requiredCapacity: candidate.requiredCapacity,
    lockedCapacity: 0,
    status: "ACCEPTED",
  });

  const result = scheduleOrdersInMemory(
    todayKey,
    filteredInputs,
    capacityLimits
  );

  if (!result.success) {
    return {
      canAccept: false,
      reason: result.reason,
      suggestedDates: [],
    };
  }

  const candidateAllocations = result.allocations.get(candidate.id) ?? [];
  return {
    canAccept: true,
    suggestedDates: candidateAllocations.map((alloc) => ({
      date: parseDateKey(alloc.dateKey).toISOString(),
      quantity: alloc.quantity,
    })),
  };
}

/**
 * Rebuilds the future capacity schedule in the database.
 */
export async function rebuildSchedule() {
  const todayKey = formatDateKey(new Date(), false);
  const todayDate = parseDateKey(todayKey);
  const { inputs, capacityLimits } = await getSchedulerData(todayKey);

  const result = scheduleOrdersInMemory(todayKey, inputs, capacityLimits);
  if (!result.success) {
    throw new Error(`Cannot rebuild schedule: ${result.reason}`);
  }

  // Database update transaction
  await prisma.$transaction(async (tx) => {
    // 1. Delete all future reservations (where capacity.date > today) for active orders
    await tx.capacityReservation.deleteMany({
      where: {
        capacity: {
          date: {
            gt: todayDate,
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
        const dateObj = parseDateKey(alloc.dateKey);

        let capacity = await tx.capacity.findUnique({
          where: { date: dateObj },
        });

        if (!capacity) {
          capacity = await tx.capacity.create({
            data: {
              date: dateObj,
              maximumCapacity: DAILY_PRODUCTION_CAPACITY,
            },
          });
        }

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

    // 3. Remove future reservations for cancelled/refunded/rejected/shipped/delivered orders
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
            gt: todayDate,
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
  const todayKey = formatDateKey(new Date(), false);
  const todayDate = parseDateKey(todayKey);
  const end = parseDateKey(addDaysToKey(todayKey, daysAhead));

  const capacities = await prisma.capacity.findMany({
    where: {
      date: {
        gte: todayDate,
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
    capacityMap.set(formatDateKey(cap.date, true), cap);
  }

  const rows = [];
  for (let i = 0; i <= daysAhead; i++) {
    const dateKey = addDaysToKey(todayKey, i);
    const capRecord = capacityMap.get(dateKey);

    const maxCap = capRecord?.maximumCapacity ?? DAILY_PRODUCTION_CAPACITY;
    const reservations = capRecord?.reservations ?? [];
    const used = reservations.reduce((sum, res) => sum + res.quantity, 0);

    rows.push({
      date: parseDateKey(dateKey),
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
