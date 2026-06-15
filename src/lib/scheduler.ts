import { prisma } from "./prisma";
import { DAILY_PRODUCTION_CAPACITY } from "./capacity";

export function formatDateKey(date: Date, isUtc = false): string {
  const year = isUtc ? date.getUTCFullYear() : date.getFullYear();
  const month = String((isUtc ? date.getUTCMonth() : date.getMonth()) + 1).padStart(2, "0");
  const day = String(isUtc ? date.getUTCDate() : date.getDate()).padStart(2, "0");
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
 * Allocates FORWARD from todayKey towards the deadline.
 */
export function scheduleOrdersInMemory(
  todayKey: string,
  orders: OrderScheduleInput[],
  capacityLimits: Map<string, number>,
  completedWorkMap: Map<string, number>
): {
  success: boolean;
  allocations: Map<string, ScheduledAllocation[]>;
  reason?: string;
} {
  const futureAllocations = new Map<string, ScheduledAllocation[]>();
  const consumedCapacity = new Map<string, number>();

  const getRemainingCapacity = (dateKey: string) => {
    const limit = capacityLimits.get(dateKey) ?? DAILY_PRODUCTION_CAPACITY;
    const completed = completedWorkMap.get(dateKey) ?? 0;
    const consumed = consumedCapacity.get(dateKey) ?? 0;
    return Math.max(0, limit - completed - consumed);
  };

  // Calculate remaining needs and constraints for all orders
  const ordersToSchedule = orders
    .map((order) => {
      const remainingToSchedule = order.requiredCapacity - order.lockedCapacity;
      if (remainingToSchedule <= 0) {
        return null;
      }

      // Available dates: from todayKey to deadlineKey inclusive
      const availableDates: string[] = [];
      let currentKey = todayKey;
      while (currentKey <= order.productionDeadlineKey) {
        availableDates.push(currentKey);
        currentKey = addDaysToKey(currentKey, 1);
      }

      // Calculate total available capacity in the window
      const availableCapacityInWindow = availableDates.reduce((sum, dKey) => {
        const limit = capacityLimits.get(dKey) ?? DAILY_PRODUCTION_CAPACITY;
        const completed = completedWorkMap.get(dKey) ?? 0;
        return sum + Math.max(0, limit - completed);
      }, 0);

      // Slack is the available capacity in window minus the remaining capacity to schedule
      const slack = availableCapacityInWindow - remainingToSchedule;

      return {
        order,
        remainingToSchedule,
        availableDates,
        availableDays: availableDates.length,
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
    if (Math.abs(a.slack - b.slack) > 0.001) {
      return a.slack - b.slack;
    }
    if (a.order.productionDeadlineKey < b.order.productionDeadlineKey) return -1;
    if (a.order.productionDeadlineKey > b.order.productionDeadlineKey) return 1;
    return 0;
  });

  // Allocate forwards from todayKey to deadline
  for (const { order, remainingToSchedule, availableDates } of ordersToSchedule) {
    let needed = remainingToSchedule;
    const orderAllocations: ScheduledAllocation[] = [];

    for (let i = 0; i < availableDates.length; i++) {
      if (needed <= 0.001) break;
      const dateKey = availableDates[i];
      const remainingCap = getRemainingCapacity(dateKey);

      if (remainingCap > 0.001) {
        const allocate = Math.min(needed, remainingCap);
        consumedCapacity.set(dateKey, (consumedCapacity.get(dateKey) ?? 0) + allocate);
        orderAllocations.push({ dateKey, quantity: allocate });
        needed -= allocate;
      }
    }

    if (needed > 0.001) {
      return {
        success: false,
        allocations: new Map(),
        reason: `Order ${order.orderNumber} (ID: ${order.id}) cannot be completed before its deadline (${order.productionDeadlineKey}). Missing ${needed.toFixed(2)} capacity units.`,
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
    capacityLimits.set(dateStr, Number(cap.maximumCapacity));
  }

  // Build completedWorkMap: dateKey -> sum(completedQuantity) for all reservations
  const completedWorkMap = new Map<string, number>();
  const reservations = await prisma.capacityReservation.findMany({
    include: {
      capacity: true,
    },
  });
  for (const res of reservations) {
    const dKey = formatDateKey(res.capacity.date, true);
    const completed = Number(res.completedQuantity);
    completedWorkMap.set(dKey, (completedWorkMap.get(dKey) ?? 0) + completed);
  }

  const inputs: OrderScheduleInput[] = orders.map((order) => {
    const requiredCapacity = order.items.reduce(
      (sum, item) => sum + item.quantity * Number(item.product.productionDays),
      0
    );

    // Sum completedQuantity across all reservations of this order
    const lockedCapacity = order.capacityReservations.reduce(
      (sum, res) => sum + Number(res.completedQuantity),
      0
    );

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      productionDeadlineKey: formatDateKey(order.productionDeadline!, true),
      requiredCapacity,
      lockedCapacity,
      status: order.status,
    };
  });

  return { inputs, capacityLimits, completedWorkMap };
}

/**
 * Checks if a candidate order can be accepted.
 */
export async function checkAcceptability(
  candidate: {
    id: string;
    orderNumber: string;
    productionDeadline: Date;
    requiredCapacity: number;
  }
) {
  const todayKey = formatDateKey(new Date(), false);
  const { inputs, capacityLimits, completedWorkMap } = await getSchedulerData(todayKey);

  const filteredInputs = inputs.filter((inp) => inp.id !== candidate.id);
  filteredInputs.push({
    id: candidate.id,
    orderNumber: candidate.orderNumber,
    productionDeadlineKey: formatDateKey(candidate.productionDeadline, true),
    requiredCapacity: candidate.requiredCapacity,
    lockedCapacity: 0,
    status: "ACCEPTED",
  });

  const result = scheduleOrdersInMemory(todayKey, filteredInputs, capacityLimits, completedWorkMap);
  
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
  const { inputs, capacityLimits, completedWorkMap } = await getSchedulerData(todayKey);

  const result = scheduleOrdersInMemory(todayKey, inputs, capacityLimits, completedWorkMap);
  if (!result.success) {
    throw new Error(`Cannot rebuild schedule: ${result.reason}`);
  }

  // Load all existing reservations on or after today date
  const existingReservations = await prisma.capacityReservation.findMany({
    where: {
      capacity: {
        date: {
          gte: todayDate,
        },
      },
    },
    include: {
      capacity: true,
    },
  });

  const completedMap = new Map<string, number>(); // orderId_dateKey -> completedQuantity
  for (const res of existingReservations) {
    const dKey = formatDateKey(res.capacity.date, true);
    completedMap.set(`${res.orderId}_${dKey}`, Number(res.completedQuantity));
  }

  // Gather new planned allocations from scheduler
  const newAllocations = new Map<string, number>(); // orderId_dateKey -> allocatedQuantity
  for (const [orderId, allocs] of result.allocations.entries()) {
    for (const alloc of allocs) {
      newAllocations.set(`${orderId}_${alloc.dateKey}`, alloc.quantity);
    }
  }

  // Determine the set of keys to update/delete
  const allKeys = new Set([...completedMap.keys(), ...newAllocations.keys()]);

  await prisma.$transaction(async (tx) => {
    // Upsert or Delete based on planned + completed quantities
    for (const key of allKeys) {
      const [orderId, dKey] = key.split("_");
      const dateObj = parseDateKey(dKey);
      const C = completedMap.get(key) ?? 0;
      const A = newAllocations.get(key) ?? 0;
      const totalPlanned = C + A;

      // Find or create the capacity record for this date
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

      if (totalPlanned > 0.001) {
        await tx.capacityReservation.upsert({
          where: {
            capacityId_orderId: {
              capacityId: capacity.id,
              orderId,
            },
          },
          update: {
            plannedQuantity: totalPlanned,
            completedQuantity: C,
          },
          create: {
            capacityId: capacity.id,
            orderId,
            plannedQuantity: totalPlanned,
            completedQuantity: C,
          },
        });
      } else {
        // Delete reservation if it exists and totalPlanned is 0
        const existingRes = existingReservations.find(
          (r) => r.orderId === orderId && formatDateKey(r.capacity.date, true) === dKey
        );
        if (existingRes) {
          await tx.capacityReservation.delete({
            where: { id: existingRes.id },
          });
        }
      }
    }

    // Clean up future reservations (date >= today) for cancelled/inactive orders
    const inactiveReservations = await tx.capacityReservation.findMany({
      where: {
        capacity: {
          date: {
            gte: todayDate,
          },
        },
        order: {
          status: {
            in: ["CANCELLED", "REFUNDED", "REJECTED", "SHIPPED", "DELIVERED", "PAYMENT_REJECTED"],
          },
        },
      },
    });

    for (const r of inactiveReservations) {
      const completedVal = Number(r.completedQuantity);
      if (completedVal > 0.001) {
        // Keep completed history but remove planned excess
        await tx.capacityReservation.update({
          where: { id: r.id },
          data: {
            plannedQuantity: completedVal,
          },
        });
      } else {
        await tx.capacityReservation.delete({
          where: { id: r.id },
        });
      }
    }
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

  const capacityMap = new Map<string, typeof capacities[0]>();
  for (const cap of capacities) {
    capacityMap.set(formatDateKey(cap.date, true), cap);
  }

  const rows = [];
  for (let i = 0; i <= daysAhead; i++) {
    const dateKey = addDaysToKey(todayKey, i);
    const capRecord = capacityMap.get(dateKey);

    const maxCap = capRecord ? Number(capRecord.maximumCapacity) : DAILY_PRODUCTION_CAPACITY;
    const reservations = capRecord?.reservations ?? [];
    
    // Used capacity on this day is the sum of plannedQuantity
    const used = reservations.reduce((sum, res) => sum + Number(res.plannedQuantity), 0);

    rows.push({
      date: parseDateKey(dateKey),
      dailyCapacity: maxCap,
      used,
      remaining: Math.max(0, maxCap - used),
      isFull: used >= maxCap,
      reservations: reservations.map((res) => ({
        id: res.id,
        quantity: Number(res.plannedQuantity), // planned effort on this day
        completedQuantity: Number(res.completedQuantity),
        order: res.order,
      })),
    });
  }

  return rows;
}
