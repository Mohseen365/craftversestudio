import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { releaseCapacityReservation } from "@/lib/capacity";
import { rebuildSchedule } from "@/lib/scheduler";
import {
  notifyCustomerOrderConfirmed,
  notifyCustomerStatusUpdate,
} from "@/lib/email";
import { ORDER_STATUS_LABELS } from "@/lib/utils";

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

    if (body.verifyPayment) {
      await prisma.$transaction([
        prisma.payment.updateMany({
          where: { orderId: id, status: "PENDING" },
          data: { status: "VERIFIED", verifiedAt: new Date() },
        }),
        prisma.order.update({
          where: { id },
          data: { status: "CONFIRMED" },
        }),
      ]);

      await rebuildSchedule();

      return NextResponse.json({ success: true, status: "CONFIRMED" });
    }

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

    if (body.status === "CANCELLED" || body.status === "REFUNDED") {
      await releaseCapacityReservation(id);
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: body.status,
        trackingNumber: body.trackingNumber,
      },
    });

    if (body.status) {
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
