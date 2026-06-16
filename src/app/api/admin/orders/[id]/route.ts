import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { rebuildSchedule } from "@/lib/scheduler";
import { SCHEDULABLE_STATUSES, INACTIVE_STATUSES } from "@/lib/constants";

const updateSchema = z.object({
  status: z
    .enum([
      "PENDING_REVIEW",
      "ACCEPTED",
      "REJECTED",
      "PAYMENT_PENDING",
      "PAYMENT_SUBMITTED",
      "PAYMENT_VERIFICATION",
      "PAYMENT_REJECTED",
      "CONFIRMED",
      "IN_PRODUCTION",
      "READY_TO_SHIP",
      "SHIPPED",
      "DELIVERED",
      "WAITLISTED",
      "CANCELLED",
      "REFUNDED",
    ])
    .optional(),
  trackingNumber: z.string().optional(),
  verifyPayment: z.boolean().optional(),
  rejectPayment: z.boolean().optional(),
});

/**
 * Returns true when a status transition changes whether the order is part of
 * the production schedule — i.e. crosses the boundary between SCHEDULABLE and
 * INACTIVE status sets.  Only these transitions require a rebuildSchedule().
 */
function schedulingAffected(fromStatus: string, toStatus: string): boolean {
  const wasSchedulable = (SCHEDULABLE_STATUSES as readonly string[]).includes(fromStatus);
  const isSchedulable  = (SCHEDULABLE_STATUSES as readonly string[]).includes(toStatus);
  const wasInactive    = (INACTIVE_STATUSES as readonly string[]).includes(fromStatus);
  const isInactive     = (INACTIVE_STATUSES as readonly string[]).includes(toStatus);
  // Rebuild when order enters or leaves the schedulable set
  return wasSchedulable !== isSchedulable || wasInactive !== isInactive;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = updateSchema.parse(await req.json());

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // --- Verify payment: PAYMENT_VERIFICATION → CONFIRMED ---
    // Both statuses are in SCHEDULABLE_STATUSES so the schedule does not change.
    // No rebuildSchedule() needed.
    if (body.verifyPayment) {
      await prisma.$transaction([
        prisma.payment.updateMany({
          where: { orderId: id, status: "UPLOADED" },
          data: { status: "VERIFIED", verifiedAt: new Date() },
        }),
        prisma.order.update({
          where: { id },
          data: { status: "CONFIRMED" },
        }),
      ]);

      return NextResponse.json({ success: true, status: "CONFIRMED" });
    }

    // --- Reject payment: PAYMENT_VERIFICATION → PAYMENT_REJECTED ---
    // PAYMENT_REJECTED is INACTIVE — order leaves the schedule. Rebuild needed.
    if (body.rejectPayment) {
      await prisma.$transaction([
        prisma.payment.updateMany({
          where: { orderId: id, status: "PENDING" },
          data: { status: "REJECTED" },
        }),
        prisma.order.update({
          where: { id },
          data: { status: "PAYMENT_REJECTED" },
        }),
      ]);
      await rebuildSchedule();
      return NextResponse.json({ success: true, status: "PAYMENT_REJECTED" });
    }

    // --- Generic status / trackingNumber update ---
    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: body.status,
        trackingNumber: body.trackingNumber,
      },
    });

    // Only rebuild when the status change moves the order into or out of the
    // schedulable set (e.g. SHIPPED, DELIVERED, CANCELLED, REFUNDED).
    // Pure tracking-number updates and in-schedule progressions
    // (CONFIRMED → IN_PRODUCTION → READY_TO_SHIP) do NOT need a rebuild.
    if (body.status && schedulingAffected(order.status, body.status)) {
      await rebuildSchedule();
    }

    return NextResponse.json({ order: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
