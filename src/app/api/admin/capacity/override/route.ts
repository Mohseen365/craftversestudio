// src/app/api/admin/capacity/override/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/adminAuth";
import { rebuildSchedule } from "@/lib/scheduler";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * POST /api/admin/capacity/override
 * Body: { date: string (ISO), maximumHours: number, expectedVersion?: number }
 *
 * Overrides the maximum production hours for a specific date.
 * Uses optimistic locking to prevent concurrent override conflicts.
 * Triggers a full schedule rebuild after the override.
 */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, maximumHours, expectedVersion } = body;

  if (
    !date ||
    typeof maximumHours !== "number" ||
    maximumHours < 0 ||
    maximumHours > 24
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid payload. maximumHours must be a number between 0 and 24.",
      },
      { status: 400 },
    );
  }

  const targetDate = new Date(date);
  const maximumHoursDecimal = new Decimal(maximumHours);

  try {
    const capacity = await prisma.$transaction(async (tx) => {
      const existing = await tx.capacity.findUnique({
        where: { date: targetDate },
      });

      // Optimistic locking check
      if (
        expectedVersion !== undefined &&
        existing &&
        existing.version !== expectedVersion
      ) {
        throw new Error(
          `Conflict: Capacity was modified by another admin. ` +
            `Expected version ${expectedVersion}, current version ${existing.version}. ` +
            `Please refresh and try again.`,
        );
      }

      const oldMaxHours =
        existing?.maximumHours?.toNumber() ??
        (await tx
          .$queryRawUnsafe<Array<{ hours: number }>>(
            `SELECT "maximumHours" FROM "Capacity" WHERE "date" = $1`,
            targetDate.toISOString(),
          )
          .then((r) => r[0]?.hours ?? 8)
          .catch(() => 8));

      const updated = await tx.capacity.upsert({
        where: { date: targetDate },
        create: {
          date: targetDate,
          maximumHours: maximumHoursDecimal,
          isOverridden: true,
          version: 1,
        },
        update: {
          maximumHours: maximumHoursDecimal,
          isOverridden: true,
          version: { increment: 1 },
        },
      });

      // Audit log with CORRECT before/after values
      await tx.auditLog.create({
        data: {
          action: "CAPACITY_OVERRIDE",
          entityId: updated.id,
          entityType: "Capacity",
          beforeJson: JSON.stringify({
            maximumHours: oldMaxHours,
          }),
          afterJson: JSON.stringify({
            maximumHours: maximumHoursDecimal.toNumber(),
          }),
          userId: "admin",
        },
      });

      return updated;
    });

    // Trigger schedule rebuild (outside transaction)
    try {
      await rebuildSchedule();
    } catch (error) {
      console.error(
        "Failed to rebuild schedule after capacity override:",
        error,
      );
      // Don't fail the request - the override was saved
    }

    return NextResponse.json({
      success: true,
      capacity: {
        date: capacity.date.toISOString(),
        maximumHours: capacity.maximumHours.toNumber(),
        version: capacity.version,
        isOverridden: capacity.isOverridden,
      },
    });
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes("Conflict")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    console.error("Capacity override error:", error);
    return NextResponse.json(
      { error: "Failed to update capacity" },
      { status: 500 },
    );
  }
}
