// src/app/api/admin/capacity/override/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

/**
 * POST /api/admin/capacity/override
 * Body: { date: string (ISO), maximumCapacity: number }
 * Returns the updated Capacity record.
 * Enforces that only one manual override (isManual) can exist per date.
 * Logs the action in AuditLog.
 */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, maximumCapacity } = await req.json();
  if (!date || typeof maximumCapacity !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const targetDate = new Date(date);
  // Find or create the Capacity record for the given date
  let capacity = await prisma.capacity.findUnique({ where: { date: targetDate } });
  if (!capacity) {
    capacity = await prisma.capacity.create({
      data: { date: targetDate, maximumCapacity },
    });
  }

  // Enforce only one manual override globally
  const existingGlobalManual = await prisma.capacityReservation.findFirst({
    where: { isManual: true },
  });
  if (existingGlobalManual && existingGlobalManual.capacityId !== capacity.id) {
    return NextResponse.json(
      { error: "Only one manual capacity override can exist at a time" },
      { status: 409 }
    );
  }

  // Ensure no other manual override exists for this date (redundant but kept for safety)
  const existingDateManual = await prisma.capacityReservation.findFirst({
    where: { capacityId: capacity.id, isManual: true },
  });
  if (existingDateManual && existingDateManual.capacityId !== capacity.id) {
    return NextResponse.json(
      { error: "A manual capacity override already exists for this date" },
      { status: 409 }
    );
  }

  // Update the capacity (or keep existing if already present)
  capacity = await prisma.capacity.update({
    where: { id: capacity.id },
    data: { maximumCapacity },
  });

  // Create or update the manual CapacityReservation to represent the override
  const overrideRes = await prisma.capacityReservation.upsert({
    where: {
      capacityId_orderId: { capacityId: capacity.id, orderId: "override-system" },
    },
    update: {
      plannedQuantity: maximumCapacity,
      completedQuantity: 0,
      isManual: true,
      manualQuantity: maximumCapacity,
    },
    create: {
      capacityId: capacity.id,
      orderId: "override-system",
      plannedQuantity: maximumCapacity,
      completedQuantity: 0,
      isManual: true,
      manualQuantity: maximumCapacity,
    },
  });

  // Audit log for override creation/update
  await prisma.auditLog.create({
    data: {
      action: "CAPACITY_OVERRIDE",
      entityId: capacity.id,
      entityType: "Capacity",
      beforeJson: JSON.stringify({ maximumCapacity: capacity.maximumCapacity }),
      afterJson: JSON.stringify({ maximumCapacity }),
      userId: "admin",
    },
  });

  return NextResponse.json({ capacity, overrideReservation: overrideRes });
}
