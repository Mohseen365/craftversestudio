import { prisma } from "./prisma";
import { toDateOnly } from "./utils";

export async function getCapacityForDate(date: Date) {
  const dateOnly = toDateOnly(date);
  return prisma.capacity.findUnique({ where: { date: dateOnly } });
}

export async function getBookedQuantity(date: Date): Promise<number> {
  const dateOnly = toDateOnly(date);
  const capacity = await prisma.capacity.findUnique({
    where: { date: dateOnly },
    include: { reservations: true },
  });
  if (!capacity) return 0;
  return capacity.reservations.reduce((sum, r) => sum + r.quantity, 0);
}

export async function getRemainingCapacity(date: Date): Promise<number | null> {
  const dateOnly = toDateOnly(date);
  const capacity = await prisma.capacity.findUnique({
    where: { date: dateOnly },
    include: { reservations: true },
  });
  if (!capacity) return null;
  const booked = capacity.reservations.reduce((sum, r) => sum + r.quantity, 0);
  return capacity.maximumCapacity - booked;
}

export async function isDateAvailable(date: Date, quantity: number): Promise<boolean> {
  const remaining = await getRemainingCapacity(date);
  if (remaining === null) return false;
  return remaining >= quantity;
}

export async function reserveCapacity(date: Date, orderId: string, quantity: number) {
  const dateOnly = toDateOnly(date);

  return prisma.$transaction(async (tx) => {
    const capacity = await tx.capacity.findUnique({
      where: { date: dateOnly },
      include: { reservations: true },
    });

    if (!capacity) {
      throw new Error("No capacity set for this date");
    }

    const booked = capacity.reservations.reduce((sum, r) => sum + r.quantity, 0);
    if (booked + quantity > capacity.maximumCapacity) {
      throw new Error("Date is full");
    }

    return tx.capacityReservation.create({
      data: {
        capacityId: capacity.id,
        orderId,
        quantity,
      },
    });
  });
}

export async function releaseCapacityReservation(orderId: string) {
  await prisma.capacityReservation.deleteMany({ where: { orderId } });
}

export async function getAvailableDates(daysAhead = 30) {
  const today = toDateOnly(new Date());
  const end = new Date(today);
  end.setDate(end.getDate() + daysAhead);

  const capacities = await prisma.capacity.findMany({
    where: {
      date: { gte: today, lte: end },
    },
    include: { reservations: true },
    orderBy: { date: "asc" },
  });

  return capacities.map((c) => {
    const booked = c.reservations.reduce((sum, r) => sum + r.quantity, 0);
    return {
      date: c.date,
      maximumCapacity: c.maximumCapacity,
      booked,
      remaining: c.maximumCapacity - booked,
      available: c.maximumCapacity - booked > 0,
    };
  });
}
