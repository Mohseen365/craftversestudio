// src/lib/scheduler.ts
import { prisma } from "./prisma";
import { getDailyProductionCapacity } from "./capacity";
import { SCHEDULABLE_STATUSES, INACTIVE_STATUSES } from "./constants";

// Fallback constant for default daily capacity (used when no override is present)
const DAILY_PRODUCTION_CAPACITY = 1; // Default value; actual capacity may be fetched dynamically elsewhere

/** Helper to format a Date as YYYY‑MM‑DD */
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

/** Parse a YYYY‑MM‑DD string back to a UTC Date */
export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Add *days* to a YYYY‑MM‑DD key */
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
 * In‑memory scheduling algorithm. It walks forward from *todayKey* towards each order's deadline
 * and attempts to allocate the required capacity respecting daily limits and already completed work.
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

  const getRemaining = (dateKey: string) => {
    const limit = capacityLimits.get(dateKey) ?? DAILY_PRODUCTION_CAPACITY;
    const completed = completedWorkMap.get(dateKey) ?? 0;
    const consumed = consumedCapacity.get(dateKey) ?? 0;
    return Math.max(0, limit - completed - consumed);
  };

  // Build a list of orders that still need capacity and their viable date windows
  const toSchedule = orders
    .map((o) => {
      const remaining = o.requiredCapacity - o.lockedCapacity;
      if (remaining <= 0) return null;
      const dates: string[] = [];
      let cur = todayKey;
      while (cur <= o.productionDeadlineKey) {
        dates.push(cur);
        cur = addDaysToKey(cur, 1);
      }
      const windowCapacity = dates.reduce((sum, d) => {
        const limit = capacityLimits.get(d) ?? DAILY_PRODUCTION_CAPACITY;
        const completed = completedWorkMap.get(d) ?? 0;
        return sum + Math.max(0, limit - completed);
      }, 0);
      const slack = windowCapacity - remaining;
      return { order: o, remaining, dates, slack, windowSize: dates.length };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Sort by most constrained first (fewest dates, then lowest slack, then earliest deadline)
  toSchedule.sort((a, b) => {
    if (a.windowSize !== b.windowSize) return a.windowSize - b.windowSize;
    if (Math.abs(a.slack - b.slack) > 0.001) return a.slack - b.slack;
    return a.order.productionDeadlineKey < b.order.productionDeadlineKey
      ? -1
      : 1;
  });

  for (const { order, remaining, dates } of toSchedule) {
    let need = remaining;
    const allocs: ScheduledAllocation[] = [];
    for (const d of dates) {
      if (need <= 0.001) break;
      const avail = getRemaining(d);
      if (avail > 0.001) {
        const use = Math.min(need, avail);
        consumedCapacity.set(d, (consumedCapacity.get(d) ?? 0) + use);
        allocs.push({ dateKey: d, quantity: use });
        need -= use;
      }
    }
    if (need > 0.001) {
      return {
        success: false,
        allocations: new Map(),
        reason: `Order ${order.orderNumber} (ID: ${
          order.id
        }) cannot be satisfied before its deadline. Missing ${need.toFixed(
          2
        )} capacity units.`,
      };
    }
    futureAllocations.set(order.id, allocs);
  }

  return { success: true, allocations: futureAllocations };
}

/**
 * Pulls the current scheduling context: active orders, capacity limits, and already completed work.
 * Uses **centralised status constants** to avoid mismatches.
 */
export async function getSchedulerData(todayKey: string) {
  const todayDate = parseDateKey(todayKey);

  const orders = await prisma.order.findMany({
    where: {
      status: { in: [...SCHEDULABLE_STATUSES] },
      productionDeadline: { not: null },
    },
    include: {
      items: {
        select: { quantity: true },
        include: { product: { select: { productionDays: true } } },
      },
      capacityReservations: { include: { capacity: true } },
    },
  });

  // Determine the farthest production deadline we need to consider
  const latestOrder = await prisma.order.findFirst({
    where: {
      status: { notIn: [...INACTIVE_STATUSES] },
      productionDeadline: { gte: todayDate },
    },
    orderBy: { productionDeadline: "desc" },
    select: { productionDeadline: true },
  });
  const endDate = latestOrder?.productionDeadline ?? todayDate;

  // Capacity limits for the window [today, endDate]
  const caps = await prisma.capacity.findMany({
    where: { date: { gte: todayDate, lte: endDate } },
  });
  const capacityLimits = new Map<string, number>();
  for (const c of caps) {
    capacityLimits.set(
      formatDateKey(c.date, true),
      c.maximumCapacity.toNumber()
    );
  }

  // Completed work per date (sum of completedQuantity across reservations)
  const reservations = await prisma.capacityReservation.findMany({
    where: { capacity: { date: { gte: todayDate, lte: endDate } } },
    include: { capacity: true },
  });
  const completedWorkMap = new Map<string, number>();
  for (const r of reservations) {
    const key = formatDateKey(r.capacity.date, true);
    const qty = Number(r.completedQuantity);
    completedWorkMap.set(key, (completedWorkMap.get(key) ?? 0) + qty);
  }

  const inputs: OrderScheduleInput[] = orders.map((o) => {
    const required = o.items.reduce(
      (sum, i) => sum + i.quantity * i.product.productionDays.toNumber(),
      0
    );
    const locked = o.capacityReservations.reduce(
      (s, r) => s + Number(r.completedQuantity),
      0
    );
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      productionDeadlineKey: formatDateKey(o.productionDeadline!, true),
      requiredCapacity: required,
      lockedCapacity: locked,
      status: o.status,
    };
  });

  return { inputs, capacityLimits, completedWorkMap };
}

/** Validate a prospective order without persisting anything */
export async function checkAcceptability(candidate: {
  id: string;
  orderNumber: string;
  productionDeadline: Date;
  requiredCapacity: number;
}) {
  const todayKey = formatDateKey(new Date(), false);
  const { inputs, capacityLimits, completedWorkMap } = await getSchedulerData(
    todayKey
  );

  const filtered = inputs.filter((i) => i.id !== candidate.id);
  filtered.push({
    id: candidate.id,
    orderNumber: candidate.orderNumber,
    productionDeadlineKey: formatDateKey(candidate.productionDeadline, true),
    requiredCapacity: candidate.requiredCapacity,
    lockedCapacity: 0,
    status: "ACCEPTED",
  });

  const result = scheduleOrdersInMemory(
    todayKey,
    filtered,
    capacityLimits,
    completedWorkMap
  );
  if (!result.success) {
    return { canAccept: false, reason: result.reason, suggestedDates: [] };
  }
  const alloc = result.allocations.get(candidate.id) ?? [];
  return {
    canAccept: true,
    suggestedDates: alloc.map((a) => ({
      date: parseDateKey(a.dateKey).toISOString(),
      quantity: a.quantity,
    })),
  };
}

/**
 * Rebuilds the future schedule **and** returns fresh planning rows for the UI.
 * It persists allocations via upserts, creates missing capacity rows, and cleans obsolete reservations.
 */
export async function rebuildSchedule() {
  const todayKey = formatDateKey(new Date(), false);
  const todayDate = parseDateKey(todayKey);
  const { inputs, capacityLimits, completedWorkMap } = await getSchedulerData(
    todayKey
  );

  const result = scheduleOrdersInMemory(
    todayKey,
    inputs,
    capacityLimits,
    completedWorkMap
  );
  if (!result.success) {
    throw new Error(`Cannot rebuild schedule: ${result.reason}`);
  }

  await prisma.$transaction(async (tx) => {
    // Ensure a capacity row exists for every date we might allocate to
    for (const dateKey of capacityLimits.keys()) {
      const date = parseDateKey(dateKey);
      await tx.capacity.upsert({
        where: { date },
        update: {},
        create: { date, maximumCapacity: DAILY_PRODUCTION_CAPACITY },
      });
    }

    // Delete all *non‑manual* future reservations – they will be regenerated below
    await tx.capacityReservation.deleteMany({
      where: { capacity: { date: { gte: todayDate } }, isManual: false },
    });

    // Insert new reservations based on the allocation map
    const creates: any[] = [];
    for (const [orderId, allocs] of result.allocations.entries()) {
      for (const a of allocs) {
        const date = parseDateKey(a.dateKey);
        creates.push({
          orderId,
          capacity: { connect: { date } },
          plannedQuantity: a.quantity,
          completedQuantity: 0,
          manualQuantity: 0,
          isManual: false,
        });
      }
    }
    if (creates.length)
      await tx.capacityReservation.createMany({ data: creates });
  });

  // Return planning rows in the same shape the UI expects
  const rows = await getSchedulerPlanningRows();
  return rows;
}

/** Helper used by the UI to fetch rows after a rebuild */
export async function getSchedulerPlanningRows() {
  const todayKey = formatDateKey(new Date(), false);
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
    include: {
      reservations: {
        include: {
          order: {
            include: {
              user: {
                include: {
                  addresses: {
                    orderBy: { id: "desc" },
                    take: 1,
                  },
                },
              },
              items: { include: { product: true } },
            },
          },
        },
      },
    },
    orderBy: { date: "asc" },
  });

  type CapacityRow = (typeof capacities)[number];
  const capacityMap = new Map<string, CapacityRow>();

  for (const cap of capacities) {
    capacityMap.set(formatDateKey(cap.date, true), cap);
  }

  const rows = [];

  for (
    let current = todayDate;
    current <= endDate;
    current.setUTCDate(current.getUTCDate() + 1)
  ) {
    const dateKey = formatDateKey(current, true);

    const cap = capacityMap.get(dateKey);

    const maxCap = cap
      ? cap.maximumCapacity.toNumber()
      : DAILY_PRODUCTION_CAPACITY;

    const reservations = cap?.reservations ?? [];

    const used = reservations.reduce(
      (sum, r) => sum + r.plannedQuantity.toNumber(),
      0
    );
    if (!cap) {
      rows.push({
        date: new Date(current),
        dailyCapacity: maxCap,
        used,
        remaining: Math.max(0, maxCap - used),
        isFull: used >= maxCap,
        reservations: reservations.map((r) => ({
          id: r.id,
          quantity: Number(r.plannedQuantity),
          completedQuantity: Number(r.completedQuantity),
          manualQuantity: Number(r.manualQuantity || 0),
          isManual: r.isManual ?? false,
          order: r.order,
        })),
      });
      continue;
    }
  }
  return rows;
}
