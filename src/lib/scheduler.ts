// src/lib/scheduler.ts
import { prisma } from "./prisma";
import { SCHEDULABLE_STATUSES, INACTIVE_STATUSES, DAILY_PRODUCTION_CAPACITY } from "./constants";

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

export interface SchedulerData {
  todayKey: string;
  inputs: OrderScheduleInput[];
  capacityLimits: Map<string, number>;
  completedWorkMap: Map<string, number>;
}

/**
 * Pure in-memory scheduling algorithm.
 * No DB access — all inputs are passed in.
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

  // Most constrained first: fewest dates → lowest slack → earliest deadline
  toSchedule.sort((a, b) => {
    if (a.windowSize !== b.windowSize) return a.windowSize - b.windowSize;
    if (Math.abs(a.slack - b.slack) > 0.001) return a.slack - b.slack;
    return a.order.productionDeadlineKey < b.order.productionDeadlineKey ? -1 : 1;
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
        reason: `Order ${order.orderNumber} (ID: ${order.id}) cannot be satisfied before its deadline. Missing ${need.toFixed(2)} capacity units.`,
      };
    }
    futureAllocations.set(order.id, allocs);
  }

  return { success: true, allocations: futureAllocations };
}

/**
 * Loads all scheduling inputs from the DB.
 * Returns data that can be passed directly into scheduleOrdersInMemory()
 * or rebuildSchedule() to avoid redundant DB fetches.
 */
export async function getSchedulerData(todayKey: string): Promise<SchedulerData> {
  const todayDate = parseDateKey(todayKey);

  const orders = await prisma.order.findMany({
    where: {
      status: { in: [...SCHEDULABLE_STATUSES] },
      productionDeadline: { not: null },
    },
    include: {
      items: {
        include: { product: { select: { productionDays: true } } },
      },
      capacityReservations: { include: { capacity: true } },
    },
  });

  const latestOrder = await prisma.order.findFirst({
    where: {
      status: { notIn: [...INACTIVE_STATUSES] },
      productionDeadline: { gte: todayDate },
    },
    orderBy: { productionDeadline: "desc" },
    select: { productionDeadline: true },
  });
  const endDate = latestOrder?.productionDeadline ?? todayDate;

  const caps = await prisma.capacity.findMany({
    where: { date: { gte: todayDate, lte: endDate } },
  });
  const capacityLimits = new Map<string, number>();
  for (const c of caps) {
    capacityLimits.set(formatDateKey(c.date, true), c.maximumCapacity.toNumber());
  }

  const reservations = await prisma.capacityReservation.findMany({
    where: { capacity: { date: { gte: todayDate, lte: endDate } } },
    include: { capacity: true },
  });
  const completedWorkMap = new Map<string, number>();
  for (const r of reservations) {
    const key = formatDateKey(r.capacity.date, true);
    completedWorkMap.set(key, (completedWorkMap.get(key) ?? 0) + Number(r.completedQuantity));
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

  return { todayKey, inputs, capacityLimits, completedWorkMap };
}

/**
 * Checks whether a candidate order can be accepted given current capacity.
 *
 * Accepts pre-loaded SchedulerData to avoid a redundant DB fetch when the
 * caller (e.g. the accept route) will immediately call rebuildSchedule()
 * afterwards and can share the same data.
 *
 * Returns the allocation for the candidate so the caller can pass it straight
 * into persistAllocations() without running the algorithm a second time.
 */
export async function checkAcceptability(
  candidate: {
    id: string;
    orderNumber: string;
    productionDeadline: Date;
    requiredCapacity: number;
  },
  // Optional: pass already-loaded data to skip a DB round-trip
  preloaded?: SchedulerData
): Promise<{
  canAccept: boolean;
  reason?: string;
  suggestedDates: Array<{ date: string; quantity: number }>;
  // The full allocation map so rebuildSchedule can reuse it
  allocations?: Map<string, ScheduledAllocation[]>;
  schedulerData?: SchedulerData;
}> {
  const data = preloaded ?? await getSchedulerData(formatDateKey(new Date(), false));
  const { todayKey, inputs, capacityLimits, completedWorkMap } = data;

  const filtered = inputs.filter((i) => i.id !== candidate.id);
  filtered.push({
    id: candidate.id,
    orderNumber: candidate.orderNumber,
    productionDeadlineKey: formatDateKey(candidate.productionDeadline, true),
    requiredCapacity: candidate.requiredCapacity,
    lockedCapacity: 0,
    status: "ACCEPTED",
  });

  const result = scheduleOrdersInMemory(todayKey, filtered, capacityLimits, completedWorkMap);

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
    // Hand back the full allocation map and loaded data so the accept route
    // can call rebuildSchedule without fetching or computing anything again
    allocations: result.allocations,
    schedulerData: { ...data, inputs: filtered },
  };
}

/**
 * Persists a pre-computed allocation map to the DB.
 * This is the write-only part of rebuildSchedule — separated so that the
 * accept route can reuse the allocation already computed by checkAcceptability.
 */
export async function persistAllocations(
  allocations: Map<string, ScheduledAllocation[]>,
  todayKey: string
): Promise<void> {
  const todayDate = parseDateKey(todayKey);

  // Ensure Capacity rows exist for every allocation date
  for (const allocs of allocations.values()) {
    for (const a of allocs) {
      const date = parseDateKey(a.dateKey);
      await prisma.capacity.upsert({
        where: { date },
        update: {},
        create: { date, maximumCapacity: DAILY_PRODUCTION_CAPACITY },
      });
    }
  }

  // Build dateKey → capacityId lookup (createMany needs scalar FKs)
  const capacityRows = await prisma.capacity.findMany({
    where: { date: { gte: todayDate } },
    select: { id: true, date: true },
  });
  const capacityIdByDateKey = new Map<string, string>();
  for (const row of capacityRows) {
    capacityIdByDateKey.set(formatDateKey(row.date, true), row.id);
  }

  await prisma.$transaction(async (tx) => {
    await tx.capacityReservation.deleteMany({
      where: { capacity: { date: { gte: todayDate } }, isManual: false },
    });

    const creates: {
      capacityId: string;
      orderId: string;
      plannedQuantity: number;
      completedQuantity: number;
      manualQuantity: number;
      isManual: boolean;
    }[] = [];

    for (const [orderId, allocs] of allocations.entries()) {
      for (const a of allocs) {
        const capacityId = capacityIdByDateKey.get(a.dateKey);
        if (!capacityId) continue;
        creates.push({
          capacityId,
          orderId,
          plannedQuantity: a.quantity,
          completedQuantity: 0,
          manualQuantity: 0,
          isManual: false,
        });
      }
    }

    if (creates.length) {
      await tx.capacityReservation.createMany({ data: creates });
    }
  });
}

/**
 * Full rebuild: loads data, runs the algorithm, persists.
 * Used by the PATCH orders route and other callers that don't have
 * pre-loaded data.
 *
 * Accepts optional pre-loaded SchedulerData to skip the DB fetch when
 * the caller already has it (e.g. after a checkAcceptability call).
 */
export async function rebuildSchedule(preloaded?: SchedulerData): Promise<void> {
  const todayKey = formatDateKey(new Date(), false);
  const data = preloaded ?? await getSchedulerData(todayKey);

  const result = scheduleOrdersInMemory(
    data.todayKey,
    data.inputs,
    data.capacityLimits,
    data.completedWorkMap
  );

  if (!result.success) {
    throw new Error(`Cannot rebuild schedule: ${result.reason}`);
  }

  await persistAllocations(result.allocations, data.todayKey);
}

/** Reads the current schedule state from DB for the admin capacity UI. */
export async function getSchedulerPlanningRows() {
  const todayKey = formatDateKey(new Date(), false);
  const todayDate = parseDateKey(todayKey);

  const latestOrder = await prisma.order.findFirst({
    where: {
      status: { notIn: [...INACTIVE_STATUSES] },
      occasionDate: { not: null, gte: todayDate },
    },
    orderBy: { occasionDate: "desc" },
    select: { occasionDate: true },
  });
  const endDate = latestOrder?.occasionDate ?? todayDate;

  const capacities = await prisma.capacity.findMany({
    where: { date: { gte: todayDate, lte: endDate } },
    include: {
      reservations: {
        include: {
          order: {
            include: {
              user: {
                include: {
                  addresses: { orderBy: { id: "desc" }, take: 1 },
                },
              },
              items: { include: { product: true } },
              capacityReservations: true,
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
    let current = new Date(todayDate);
    current <= endDate;
    current.setUTCDate(current.getUTCDate() + 1)
  ) {
    const dateKey = formatDateKey(current, true);
    const cap = capacityMap.get(dateKey);
    if (!cap) continue;

    const maxCap = cap.maximumCapacity.toNumber();
    const reservations = cap.reservations;
    const used = reservations.reduce((sum, r) => sum + r.plannedQuantity.toNumber(), 0);

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
  }

  return rows;
}
