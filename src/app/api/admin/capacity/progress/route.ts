// src/app/api/admin/capacity/progress/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/adminAuth";
import { formatDateKey, parseDateKey } from "@/lib/scheduler";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * POST /api/admin/capacity/progress
 * Body: { orderId: string, date: string (ISO), completedHours: number }
 *
 * Records production progress for a specific order on a specific date.
 * Increments completedHours on the matching CapacityReservation.
 * Logs an audit entry.
 */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { orderId, date, completedHours } = body;

  if (
    !orderId ||
    !date ||
    typeof completedHours !== "number" ||
    completedHours <= 0
  ) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid fields. completedHours must be a positive number.",
      },
      { status: 400 },
    );
  }

  // Use UTC-based date parsing
  const dateKey = formatDateKey(new Date(date));
  const dateOnly = parseDateKey(dateKey);

  const result = await prisma.$transaction(
    async (tx) => {
      try {
        const reservation = await tx.capacityReservation.findFirst({
          where: {
            orderId,
            capacity: { date: dateOnly },
          },
          include: { capacity: true },
        });

        if (!reservation) {
          throw new Error(
            "No reservation found for this order on the given date",
          );
        }

        const currentCompleted = Number(reservation.completedHours);
        const planned = Number(reservation.plannedHours);

        // Cap at planned hours
        const newCompleted = Math.min(completedHours, planned);

        // Validate: can't reduce completed work (use adjustment endpoint for that)
        if (newCompleted <= currentCompleted) {
          throw new Error(
            `Cannot reduce completed work. Current: ${currentCompleted}h, Attempted: ${newCompleted}h. ` +
              `Use the adjustment endpoint to reduce completed work.`,
          );
        }

        const updatedReservation = await tx.capacityReservation.update({
          where: { id: reservation.id },
          data: { completedHours: new Decimal(newCompleted) },
        });

        // Check if order is now complete
        const orderReservations = await tx.capacityReservation.findMany({
          where: { orderId },
          select: { completedHours: true },
        });

        const totalCompleted = orderReservations.reduce(
          (sum, r) => sum + Number(r.completedHours),
          0,
        );

        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: {
            items: {
              select: {
                quantity: true,
                product: { select: { productionHours: true } },
              },
            },
          },
        });

        const totalRequired =
          order?.items.reduce(
            (sum, item) =>
              sum + item.quantity * item.product.productionHours.toNumber(),
            0,
          ) ?? 0;

        // Update order denormalized hours
        const remainingHours = Math.max(0, totalRequired - totalCompleted);

        await tx.order.update({
          where: { id: orderId },
          data: {
            completedHours: new Decimal(totalCompleted),
            remainingHours: new Decimal(remainingHours),
          },
        });

        // Auto-update status if complete
        if (remainingHours <= 0.001) {
          await tx.order.update({
            where: { id: orderId },
            data: { status: "READY_TO_SHIP" },
          });
        }

        // Audit log
        await tx.auditLog.create({
          data: {
            action: "PROGRESS_UPDATE",
            entityId: reservation.id,
            entityType: "CapacityReservation",
            beforeJson: JSON.stringify({
              completedHours: currentCompleted,
              plannedHours: planned,
            }),
            afterJson: JSON.stringify({
              completedHours: newCompleted,
              plannedHours: planned,
              remainingHours,
            }),
            userId: null,
          },
        });

        return {
          completedHours: Number(updatedReservation.completedHours),
          totalCompleted,
          totalRequired,
          remainingHours,
          isComplete: remainingHours <= 0.001,
        };
      } catch (error) {
        // Log failed attempt before throwing (causes rollback)
        await tx.auditLog
          .create({
            data: {
              action: "PROGRESS_UPDATE_FAILED",
              entityId: orderId,
              entityType: "Order",
              beforeJson: JSON.stringify({
                attemptedHours: completedHours,
                date: dateKey,
              }),
              afterJson: JSON.stringify({
                error: (error as Error).message,
                timestamp: new Date().toISOString(),
              }),
              userId: null,
            },
          })
          .catch(() => {
            console.error(
              "Failed to write audit log for failed progress update",
            );
          });

        throw error;
      }
    },
    {
      isolationLevel: "ReadCommitted",
      timeout: 10000,
    },
  );

  return NextResponse.json({
    success: true,
    ...result,
  });
}
