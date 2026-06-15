import { prisma } from "./prisma";
import { addDays, toDateOnly } from "./utils";

export const DAILY_PRODUCTION_CAPACITY = 3;

export function calculateShippingDate(
  occasionDate: Date | string,
  shippingDurationDays: number
) {
  return addDays(occasionDate, -shippingDurationDays);
}

export function calculateProductionDeadline(shippingDate: Date | string) {
  return addDays(shippingDate, -1);
}

// Assuming:
// Capacity.date = production date
// CapacityReservation.quantity = capacity units consumed on that date
export async function getUsedCapacity(date: Date, excludeOrderId?: string) {
  const dateOnly = toDateOnly(date);
  // const nextDate = addDays(dateOnly, 1);

  // const result = await prisma.order.aggregate({
  //   where: {
  //     status: "ACCEPTED",
  //     productionDeadline: {
  //       gte: dateOnly,
  //       lt: nextDate,
  //     },
  //     id: excludeOrderId ? { not: excludeOrderId } : undefined,
  //   },
  //   _sum: {
  //     quantity: true,
  //   },
  // });

  // return result._sum.quantity ?? 0;
  const result = await prisma.capacityReservation.aggregate({
    where: {
      capacity: {
        date: dateOnly,
      },
      orderId: excludeOrderId
        ? {
            not: excludeOrderId,
          }
        : undefined,
    },
    _sum: {
      quantity: true,
    },
  });

  return result._sum.quantity ?? 0;
}

export async function getCapacityForDeadline(
  date: Date,
  requestedQuantity = 0,
  excludeOrderId?: string
) {
  const productionDeadline = toDateOnly(date);
  const used = await getUsedCapacity(productionDeadline, excludeOrderId);
  const remaining = DAILY_PRODUCTION_CAPACITY - used;

  return {
    productionDeadline,
    dailyCapacity: DAILY_PRODUCTION_CAPACITY,
    used,
    remaining,
    requestedQuantity,
    canAccept: used + requestedQuantity <= DAILY_PRODUCTION_CAPACITY,
  };
}

export async function getPlanningRows(daysAhead = 60) {
  const today = toDateOnly(new Date());
  const end = addDays(today, daysAhead);

  const orders = await prisma.order.findMany({
    where: {
      status: "ACCEPTED",
      productionDeadline: {
        gte: today,
        lte: end,
      },
    },
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
    orderBy: [{ productionDeadline: "asc" }, { createdAt: "asc" }],
  });

  const rows = new Map<string, { date: Date; orders: typeof orders }>();

  for (const order of orders) {
    if (!order.productionDeadline) continue;
    const date = toDateOnly(order.productionDeadline);
    const key = date.toISOString();
    const existing = rows.get(key);
    if (existing) {
      existing.orders.push(order);
    } else {
      rows.set(key, { date, orders: [order] });
    }
  }

  return Array.from(rows.values()).map((row) => {
    const used = row.orders.reduce((sum, order) => sum + order.quantity, 0);
    return {
      date: row.date,
      dailyCapacity: DAILY_PRODUCTION_CAPACITY,
      used,
      remaining: DAILY_PRODUCTION_CAPACITY - used,
      isFull: used >= DAILY_PRODUCTION_CAPACITY,
      orders: row.orders,
    };
  });
}

// export async function isDateAvailable(date: Date, quantity: number) {
//   const capacity = await getCapacityForDeadline(date, quantity);
//   return capacity.canAccept;
// }

export async function getBookedQuantity(date: Date) {
  return getUsedCapacity(date);
}

export async function getRemainingCapacity(date: Date) {
  const capacity = await getCapacityForDeadline(date);
  return capacity.remaining;
}

export async function getAvailableDates(daysAhead = 45) {
  const today = toDateOnly(new Date());
  const dates = [];

  for (let i = 0; i <= daysAhead; i += 1) {
    const date = addDays(today, i);
    const capacity = await getCapacityForDeadline(date);
    dates.push({
      date,
      maximumCapacity: DAILY_PRODUCTION_CAPACITY,
      booked: capacity.used,
      remaining: capacity.remaining,
      available: capacity.remaining > 0,
    });
  }

  return dates;
}

export async function releaseCapacityReservation(_orderId?: string) {
  return;
}
