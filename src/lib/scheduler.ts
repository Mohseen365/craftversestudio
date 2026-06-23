// src/lib/scheduler.ts
import { prisma } from "./prisma";
import { SCHEDULABLE_STATUSES, INACTIVE_STATUSES } from "./constants";

// ==================== Constants ====================

/** Default hours available per production day */
export const DEFAULT_HOURS_PER_DAY = 8;

/** Decimal precision for hour calculations */
const HOUR_PRECISION = 4;

// ==================== Date Utilities ====================

/** Format a Date as YYYY-MM-DD in UTC */
export function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parse YYYY-MM-DD string to UTC Date at midnight */
export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Add days to a date key string */
export function addDaysToKey(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKey(date);
}

/** Get today's date key */
export function getTodayKey(): string {
  return formatDateKey(new Date());
}

// ==================== Hours Helpers ====================

/**
 * Calculate total production hours required for an order
 */
export function calculateOrderHours(
  items: Array<{
    quantity: number;
    product: { productionHours: { toNumber: () => number } | number };
  }>,
): number {
  const total = items.reduce((sum, item) => {
    const hoursPerUnit =
      typeof item.product.productionHours === "object"
        ? item.product.productionHours.toNumber()
        : item.product.productionHours;

    if (hoursPerUnit < 0) {
      console.error(`Product has negative production hours: ${hoursPerUnit}`);
      return sum;
    }

    return sum + item.quantity * Math.max(0, hoursPerUnit);
  }, 0);

  // Minimum 0.25h (15 minutes) to avoid zero-hour orders
  return total <= 0.001 ? 0.25 : total;
}

/**
 * Format hours for display (e.g., "2h 30m" or "45m")
 */
export function formatHours(hours: number): string {
  if (hours === 0) return "0h";
  if (hours < 1) return `${Math.round(hours * 60)}m`;

  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (minutes === 0) return `${wholeHours}h`;
  return `${wholeHours}h ${minutes}m`;
}

// ==================== Types ====================

export interface ScheduledAllocation {
  dateKey: string;
  hours: number; // Changed from 'quantity'
}

export interface OrderScheduleInput {
  id: string;
  orderNumber: string;
  productionDeadlineKey: string;
  requiredHours: number; // Changed from 'requiredCapacity'
  lockedHours: number; // Changed from 'lockedCapacity'
  status: string;
  isLate?: boolean;
}

export interface SchedulerData {
  todayKey: string;
  inputs: OrderScheduleInput[];
  capacityLimits: Map<string, number>; // Hours per day
  completedWorkMap: Map<string, number>; // Completed hours per day
}

// ==================== Core Scheduling Algorithm ====================

/**
 * Pure in-memory scheduling algorithm.
 * No DB access — all inputs are passed in.
 */
export function scheduleOrdersInMemory(
  todayKey: string,
  orders: OrderScheduleInput[],
  capacityLimits: Map<string, number>,
  completedWorkMap: Map<string, number>,
): {
  success: boolean;
  allocations: Map<string, ScheduledAllocation[]>;
  reason?: string;
} {
  const allocations = new Map<string, ScheduledAllocation[]>();
  const consumedHours = new Map<string, number>();

  // Helper: get available hours for a given date
  const getAvailableHours = (dateKey: string): number => {
    const limit = capacityLimits.get(dateKey) ?? DEFAULT_HOURS_PER_DAY;
    const completed = completedWorkMap.get(dateKey) ?? 0;
    const consumed = consumedHours.get(dateKey) ?? 0;

    // Safety check: completed work shouldn't exceed capacity
    if (completed > limit) {
      console.error(
        `CRITICAL: Completed work (${completed}h) exceeds limit (${limit}h) on ${dateKey}`,
      );
      return 0;
    }

    return Math.max(0, limit - completed - consumed);
  };

  // Prepare orders that need scheduling
  const pendingOrders = orders
    .map((o) => {
      const remaining = o.requiredHours - o.lockedHours;
      if (remaining <= 0.001) return null; // Already satisfied

      // Build list of viable dates from today to deadline
      const viableDates: string[] = [];
      let currentDate = todayKey;

      while (currentDate <= o.productionDeadlineKey) {
        viableDates.push(currentDate);
        currentDate = addDaysToKey(currentDate, 1);
      }

      if (viableDates.length === 0) {
        viableDates.push(todayKey); // At least try today
      }

      // Calculate total window capacity (excluding completed work)
      const windowCapacity = viableDates.reduce((sum, d) => {
        const limit = capacityLimits.get(d) ?? DEFAULT_HOURS_PER_DAY;
        const completed = completedWorkMap.get(d) ?? 0;
        return sum + Math.max(0, limit - completed);
      }, 0);

      const slack = windowCapacity - remaining;

      return {
        order: o,
        remaining,
        dates: viableDates,
        slack,
        windowSize: viableDates.length,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Sort: Most constrained first
  pendingOrders.sort((a, b) => {
    if (a.windowSize !== b.windowSize) return a.windowSize - b.windowSize;
    if (Math.abs(a.slack - b.slack) > 0.001) return a.slack - b.slack;
    if (a.order.productionDeadlineKey !== b.order.productionDeadlineKey) {
      return a.order.productionDeadlineKey < b.order.productionDeadlineKey
        ? -1
        : 1;
    }
    return a.order.id < b.order.id ? -1 : 1;
  });

  // Greedy forward-fill allocation
  for (const { order, remaining, dates } of pendingOrders) {
    let need = remaining;
    const allocs: ScheduledAllocation[] = [];

    for (const dateKey of dates) {
      if (need <= 0.001) break;

      const available = getAvailableHours(dateKey);
      if (available > 0.001) {
        const allocate = Math.min(need, available);
        consumedHours.set(
          dateKey,
          (consumedHours.get(dateKey) ?? 0) + allocate,
        );
        allocs.push({
          dateKey,
          hours: Number(allocate.toFixed(HOUR_PRECISION)),
        });
        need -= allocate;
      }
    }

    if (need > 0.001) {
      return {
        success: false,
        allocations: new Map(),
        reason:
          `Order ${order.orderNumber} (${order.id}) cannot be satisfied. ` +
          `Missing ${formatHours(need)} before ${order.productionDeadlineKey}.`,
      };
    }

    allocations.set(order.id, allocs);
  }

  return { success: true, allocations };
}

// ==================== Data Loading ====================

/**
 * Load all scheduling inputs from DB.
 * Returns data ready for scheduleOrdersInMemory().
 */
export async function getSchedulerData(
  todayKey?: string,
): Promise<SchedulerData> {
  const today = todayKey ?? getTodayKey();
  const todayDate = parseDateKey(today);

  const orders = await prisma.order.findMany({
    where: {
      status: { in: [...SCHEDULABLE_STATUSES] },
      productionDeadline: { not: null },
    },
    select: {
      id: true,
      orderNumber: true,
      productionDeadline: true,
      status: true,
      items: {
        select: {
          quantity: true,
          product: { select: { productionHours: true } },
        },
      },
      capacityReservations: {
        select: { completedHours: true },
      },
    },
  });

  const latestDeadline = await prisma.order.findFirst({
    where: {
      status: { notIn: [...INACTIVE_STATUSES] },
      productionDeadline: { gte: todayDate },
    },
    orderBy: { productionDeadline: "desc" },
    select: { productionDeadline: true },
  });
  const endDate = latestDeadline?.productionDeadline ?? todayDate;

  // Fetch capacity limits (hours per day)
  const caps = await prisma.capacity.findMany({
    where: { date: { gte: todayDate, lte: endDate } },
  });
  const capacityLimits = new Map<string, number>();
  for (const c of caps) {
    capacityLimits.set(
      formatDateKey(c.date),
      c.maximumHours?.toNumber() ?? DEFAULT_HOURS_PER_DAY,
    );
  }

  // Build completed work map (completed hours per day)
  const reservations = await prisma.capacityReservation.findMany({
    where: {
      capacity: { date: { gte: todayDate, lte: endDate } },
      completedHours: { gt: 0 },
    },
    include: { capacity: true },
  });
  const completedWorkMap = new Map<string, number>();
  for (const r of reservations) {
    const key = formatDateKey(r.capacity.date);
    completedWorkMap.set(
      key,
      (completedWorkMap.get(key) ?? 0) + Number(r.completedHours),
    );
  }

  // Build order inputs
  const inputs: OrderScheduleInput[] = orders.map((o) => {
    const requiredHours = calculateOrderHours(o.items);
    const lockedHours = o.capacityReservations.reduce(
      (s, r) => s + Number(r.completedHours),
      0,
    );

    const deadlineKey = formatDateKey(o.productionDeadline!);
    const isLate = deadlineKey < today;

    if (isLate) {
      console.warn(`Order ${o.orderNumber} is past deadline: ${deadlineKey}`);
    }

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      productionDeadlineKey: deadlineKey,
      requiredHours,
      lockedHours,
      status: o.status,
      isLate,
    };
  });

  return { todayKey: today, inputs, capacityLimits, completedWorkMap };
}

// ==================== Acceptability Check ====================

/**
 * Check whether a candidate order can be accepted.
 * Returns allocations for reuse by persistAllocations().
 */
export async function checkAcceptability(
  candidate: {
    id: string;
    orderNumber: string;
    productionDeadline: Date;
    requiredHours: number;
  },
  preloaded?: SchedulerData,
): Promise<{
  canAccept: boolean;
  reason?: string;
  suggestedDates: Array<{ date: string; hours: number }>;
  allocations?: Map<string, ScheduledAllocation[]>;
  schedulerData?: SchedulerData;
}> {
  const data = preloaded ?? (await getSchedulerData());
  const { todayKey, inputs, capacityLimits, completedWorkMap } = data;

  // Build candidate input
  const candidateInput: OrderScheduleInput = {
    id: candidate.id,
    orderNumber: candidate.orderNumber,
    productionDeadlineKey: formatDateKey(candidate.productionDeadline),
    requiredHours: candidate.requiredHours,
    lockedHours: 0,
    status: "ACCEPTED",
  };

  // Check if order already exists in inputs, replace or add
  const existingIndex = inputs.findIndex((i) => i.id === candidate.id);
  let allInputs: OrderScheduleInput[];

  if (existingIndex >= 0) {
    allInputs = [...inputs];
    allInputs[existingIndex] = candidateInput;
  } else {
    allInputs = [...inputs, candidateInput];
  }

  const result = scheduleOrdersInMemory(
    todayKey,
    allInputs,
    capacityLimits,
    completedWorkMap,
  );

  if (!result.success) {
    return { canAccept: false, reason: result.reason, suggestedDates: [] };
  }

  const alloc = result.allocations.get(candidate.id) ?? [];
  return {
    canAccept: true,
    suggestedDates: alloc.map((a) => ({
      date: parseDateKey(a.dateKey).toISOString(),
      hours: a.hours,
    })),
    allocations: result.allocations,
    schedulerData: { ...data, inputs: allInputs },
  };
}

// ==================== Persistence ====================

/**
 * Persist pre-computed allocations to the DB.
 */
export async function persistAllocations(
  allocations: Map<string, ScheduledAllocation[]>,
  todayKey?: string,
): Promise<void> {
  const today = todayKey ?? getTodayKey();
  const todayDate = parseDateKey(today);

  // Collect all date keys needed
  const allDateKeys = new Set<string>();
  for (const allocs of allocations.values()) {
    for (const a of allocs) allDateKeys.add(a.dateKey);
  }

  // Ensure Capacity rows exist for all dates
  const existingCaps = await prisma.capacity.findMany({
    where: {
      date: { in: Array.from(allDateKeys).map((k) => parseDateKey(k)) },
    },
    select: { date: true },
  });
  const existingDateKeys = new Set(
    existingCaps.map((c) => formatDateKey(c.date)),
  );

  for (const dk of allDateKeys) {
    if (!existingDateKeys.has(dk)) {
      await prisma.capacity
        .create({
          data: {
            date: parseDateKey(dk),
            maximumHours: DEFAULT_HOURS_PER_DAY,
          },
        })
        .catch(() => {
          // Ignore race condition if another request creates it
        });
    }
  }

  // Build dateKey → capacityId lookup
  const capacityRows = await prisma.capacity.findMany({
    where: { date: { gte: todayDate } },
    select: { id: true, date: true },
    orderBy: { date: "asc" }, // Consistent ordering prevents deadlocks
  });
  const capacityIdByDateKey = new Map<string, string>();
  for (const row of capacityRows) {
    capacityIdByDateKey.set(formatDateKey(row.date), row.id);
  }

  await prisma.$transaction(
    async (tx) => {
      // 1. Delete future non-manual reservations with no progress
      await tx.capacityReservation.deleteMany({
        where: {
          capacity: { date: { gte: todayDate } },
          isManual: false,
          completedHours: 0,
        },
      });

      // 2. Reset remaining future non-manual reservations
      const remaining = await tx.capacityReservation.findMany({
        where: {
          capacity: { date: { gte: todayDate } },
          isManual: false,
        },
        select: { id: true, completedHours: true },
      });

      for (const res of remaining) {
        await tx.capacityReservation.update({
          where: { id: res.id },
          data: { plannedHours: res.completedHours, version: { increment: 1 } },
        });
      }

      // 3. Apply new allocations
      const creates: {
        capacityId: string;
        orderId: string;
        plannedHours: number;
        completedHours: number;
        isManual: boolean;
        version: number;
      }[] = [];

      for (const [orderId, allocs] of allocations.entries()) {
        for (const a of allocs) {
          const capacityId = capacityIdByDateKey.get(a.dateKey);
          if (!capacityId) continue;

          const existing = await tx.capacityReservation.findUnique({
            where: { capacityId_orderId: { capacityId, orderId } },
          });

          if (existing) {
            await tx.capacityReservation.update({
              where: { id: existing.id },
              data: {
                plannedHours: Number(existing.completedHours) + a.hours,
                version: { increment: 1 },
              },
            });
          } else {
            creates.push({
              capacityId,
              orderId,
              plannedHours: a.hours,
              completedHours: 0,
              isManual: false,
              version: 1,
            });
          }
        }
      }

      if (creates.length) {
        await tx.capacityReservation.createMany({ data: creates });
      }
    },
    {
      isolationLevel: "Serializable",
      timeout: 15000,
    },
  );
}

// ==================== Full Rebuild ====================

/**
 * Full schedule rebuild: load data → run algorithm → persist.
 */
export async function rebuildSchedule(
  preloaded?: SchedulerData,
): Promise<void> {
  const todayKey = getTodayKey();
  const data = preloaded ?? (await getSchedulerData(todayKey));

  const result = scheduleOrdersInMemory(
    data.todayKey,
    data.inputs,
    data.capacityLimits,
    data.completedWorkMap,
  );

  if (!result.success) {
    console.error("CRITICAL: Schedule rebuild failed", {
      reason: result.reason,
      timestamp: new Date().toISOString(),
    });
    throw new Error(`Cannot rebuild schedule: ${result.reason}`);
  }

  await persistAllocations(result.allocations, data.todayKey);
}

// ==================== Planning Data for UI ====================

/**
 * Read current planning state from DB for the admin capacity UI.
 */
export async function getSchedulerPlanningRows() {
  const todayKey = getTodayKey();
  const todayDate = parseDateKey(todayKey);

  const latestOrder = await prisma.order.findFirst({
    where: {
      status: { notIn: [...INACTIVE_STATUSES] },
      productionDeadline: { gte: todayDate },
    },
    orderBy: { productionDeadline: "desc" },
    select: { productionDeadline: true },
  });
  const endDate = latestOrder?.productionDeadline ?? todayDate;

  const capacities = await prisma.capacity.findMany({
    where: { date: { gte: todayDate, lte: endDate } },
    select: {
      id: true,
      date: true,
      maximumHours: true,
      reservations: {
        select: {
          id: true,
          plannedHours: true,
          completedHours: true,
          isManual: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              occasionDate: true,
              status: true,
              shippingDurationDays: true,
              shippingDate: true,
              productionDeadline: true,
              user: {
                select: {
                  name: true,
                  addresses: {
                    select: {
                      address: true,
                      city: true,
                      state: true,
                      pincode: true,
                    },
                    orderBy: { id: "desc" },
                    take: 1,
                  },
                },
              },
              items: {
                select: {
                  quantity: true,
                  product: { select: { name: true, productionHours: true } },
                },
              },
              capacityReservations: {
                select: { completedHours: true },
              },
            },
          },
        },
      },
    },
    orderBy: { date: "asc" },
  });

  // Build date-indexed map
  type CapacityRowRaw = (typeof capacities)[number];
  const capacityMap = new Map<string, CapacityRowRaw>();
  for (const cap of capacities) {
    capacityMap.set(formatDateKey(cap.date), cap);
  }

  const rows = [];

  for (
    let current = new Date(todayDate);
    current <= endDate;
    current.setUTCDate(current.getUTCDate() + 1)
  ) {
    const dateKey = formatDateKey(current);
    const cap = capacityMap.get(dateKey);

    if (!cap) continue;

    const maxHours = cap.maximumHours?.toNumber() ?? DEFAULT_HOURS_PER_DAY;
    const reservations = cap.reservations;
    const used = reservations.reduce(
      (sum, r) => sum + (r.plannedHours?.toNumber() ?? 0),
      0,
    );

    rows.push({
      date: new Date(current),
      dailyCapacity: maxHours,
      used: Number(used.toFixed(HOUR_PRECISION)),
      remaining: Number(Math.max(0, maxHours - used).toFixed(HOUR_PRECISION)),
      isFull: used >= maxHours,
      reservations: reservations.map((r) => ({
        id: r.id,
        quantity: Number(r.plannedHours), // Keep as 'quantity' for backward compatibility with UI
        hours: Number(r.plannedHours), // Add hours for new UI
        completedQuantity: Number(r.completedHours), // Backward compat
        completedHours: Number(r.completedHours), // New field
        isManual: r.isManual ?? false,
        order: r.order,
      })),
    });
  }

  return rows;
}
