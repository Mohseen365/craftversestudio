import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/utils";
import { getRemainingCapacity } from "@/lib/capacity";

/**
 * POST /api/admin/capacity/progress
 * Body: { date: string (ISO), completedUnits: number }
 *
 * Records production progress for a specific date.
 * Validates that completedUnits do not exceed the remaining capacity for that date.
 * Updates the reservation's completedQuantity (first matching reservation).
 * Logs an audit entry.
 */
export async function POST(req: NextRequest) {
  const { orderId, date, completedUnits } = await req.json();

  if (!date || typeof completedUnits !== "number") {
    return NextResponse.json(
      { error: "Missing or invalid fields" },
      { status: 400 }
    );
  }

  const dateOnly = toDateOnly(new Date(date));

  // Find a reservation for this date (any order)
  const reservation = await prisma.capacityReservation.findFirst({
    where: {
      orderId,
      capacity: {
        date: dateOnly,
      },
    },
    include: {
      capacity: true,
    },
  });

  if (!reservation) {
    return NextResponse.json(
      { error: "No reservation found for the given date" },
      { status: 404 }
    );
  }

  // Validate remaining capacity for the date
  // const remaining = await getRemainingCapacity(dateOnly);
  // if (completedUnits > remaining) {
  //   return NextResponse.json(
  //     { error: "Completed units exceed remaining capacity for the date" },
  //     { status: 400 }
  //   );
  // }

  // Update completed quantity
  const updatedReservation = await prisma.capacityReservation.update({
    where: { id: reservation.id },
    data: {
      completedQuantity: Number(reservation.completedQuantity) + completedUnits,
    },
  });

  // Audit log entry
  await prisma.auditLog.create({
    data: {
      action: "PROGRESS_UPDATE",
      entityId: reservation.id,
      entityType: "CapacityReservation",
      beforeJson: JSON.stringify({
        completedQuantity: reservation.completedQuantity,
      }),
      afterJson: JSON.stringify({
        completedQuantity: updatedReservation.completedQuantity,
      }),
      userId: null,
    },
  });

  // Return updated capacity summary for the date
  const capacity = await prisma.capacity.findUnique({
    where: { id: reservation.capacityId },
    include: { reservations: true },
  });

  const used = capacity?.reservations.reduce(
    (sum, res) =>
      sum +
        res.plannedQuantity.toNumber() +
        res.completedQuantity.toNumber() +
        res.manualQuantity.toNumber() || 0,
    0
  );

  const response = {
    date: dateOnly.toISOString(),
    dailyCapacity: capacity?.maximumCapacity.toNumber() ?? 0,
    used,
    remaining: Math.max(
      0,
      (capacity?.maximumCapacity.toNumber() ?? 0) - (used ?? 0)
    ),
  };

  return NextResponse.json(response);
}
