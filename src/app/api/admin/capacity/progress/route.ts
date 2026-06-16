import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { formatDateKey, parseDateKey } from "@/lib/scheduler";

/**
 * POST /api/admin/capacity/progress
 * Body: { orderId: string, date: string (ISO), completedUnits: number }
 *
 * Records production progress for a specific order on a specific date.
 * Increments completedQuantity on the matching CapacityReservation.
 * Logs an audit entry.
 */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { orderId, date, completedUnits } = body;

  if (!orderId || !date || typeof completedUnits !== "number" || completedUnits <= 0) {
    return NextResponse.json(
      { error: "Missing or invalid fields" },
      { status: 400 }
    );
  }

  // Use UTC-based date parsing to match how Capacity.date is stored in the DB
  const dateKey = formatDateKey(new Date(date), true);
  const dateOnly = parseDateKey(dateKey);

  const reservation = await prisma.capacityReservation.findFirst({
    where: {
      orderId,
      capacity: { date: dateOnly },
    },
    include: { capacity: true },
  });

  if (!reservation) {
    return NextResponse.json(
      { error: "No reservation found for this order on the given date" },
      { status: 404 }
    );
  }

  const currentCompleted = Number(reservation.completedQuantity);
  const planned = Number(reservation.plannedQuantity);
  const newCompleted = Math.min(currentCompleted + completedUnits, planned);

  const updatedReservation = await prisma.capacityReservation.update({
    where: { id: reservation.id },
    data: { completedQuantity: newCompleted },
  });

  await prisma.auditLog.create({
    data: {
      action: "PROGRESS_UPDATE",
      entityId: reservation.id,
      entityType: "CapacityReservation",
      beforeJson: JSON.stringify({ completedQuantity: currentCompleted }),
      afterJson: JSON.stringify({ completedQuantity: newCompleted }),
      userId: null,
    },
  });

  return NextResponse.json({
    success: true,
    completedQuantity: Number(updatedReservation.completedQuantity),
  });
}
