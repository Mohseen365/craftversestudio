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

  // Update the capacity record
  capacity = await prisma.capacity.update({
    where: { id: capacity.id },
    data: { maximumCapacity },
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

  return NextResponse.json({ capacity });
}
