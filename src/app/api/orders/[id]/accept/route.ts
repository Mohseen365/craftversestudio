import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  calculateProductionDeadline,
  calculateShippingDate,
} from "@/lib/capacity";
import {
  checkAcceptability,
  persistAllocations,
  getSchedulerData,
  formatDateKey,
} from "@/lib/scheduler";
import { requireAdmin } from "@/adminAuth";

const acceptSchema = z.object({
  shippingDurationDays: z.coerce.number().int().positive(),
  customizationCharge: z.coerce.number().int().positive().default(0),
  deliveryCharge: z.coerce.number().int().positive().default(0),
  urgentOrderCharge: z.coerce.number().int().positive().default(0),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = acceptSchema.safeParse(await req.json().catch(() => ({})));

    if (!body.success) {
      return NextResponse.json(
        { error: "Shipping duration is required" },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        occasionDate: true,
        subtotal: true,
        items: {
          select: {
            quantity: true,
            product: { select: { productionHours: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.occasionDate) {
      return NextResponse.json(
        { error: "Order needs an occasion date before acceptance" },
        { status: 400 },
      );
    }

    if (order.status !== "PENDING_REVIEW") {
      return NextResponse.json(
        { error: "Only orders in PENDING_REVIEW can be accepted" },
        { status: 409 },
      );
    }

    const shippingDate = calculateShippingDate(
      order.occasionDate,
      body.data.shippingDurationDays,
    );
    const productionDeadline = calculateProductionDeadline(shippingDate);
    const requiredCapacity = order.items.reduce(
      (sum, item) =>
        sum + item.quantity * item.product.productionHours.toNumber(),
      0,
    );

    // Load scheduler data once — shared by checkAcceptability and persistAllocations
    const schedulerData = await getSchedulerData(formatDateKey(new Date()));

    const check = await checkAcceptability(
      {
        id: order.id,
        orderNumber: order.orderNumber,
        productionDeadline,
        requiredHours: requiredCapacity,
      },
      schedulerData,
    );

    if (!check.canAccept) {
      return NextResponse.json(
        {
          error:
            check.reason ??
            "Accepting this order exceeds available production capacity",
        },
        { status: 409 },
      );
    }

    // Persist the order status update
    await prisma.order.update({
      where: { id },
      data: {
        status: "ACCEPTED",
        shippingDurationDays: body.data.shippingDurationDays,
        customizationCharge: body.data.customizationCharge,
        deliveryCharge: body.data.deliveryCharge,
        urgentOrderCharge: body.data.urgentOrderCharge,
        total:
          order.subtotal +
          body.data.customizationCharge +
          body.data.deliveryCharge +
          body.data.urgentOrderCharge,
        shippingDate,
        productionDeadline,
        occasionDate: order.occasionDate,
        payments: {
          updateMany: { where: {}, data: { status: "PENDING" } },
        },
      },
    });

    // Reuse the allocation already computed by checkAcceptability.
    // check.allocations and check.schedulerData are always present when canAccept is true.
    await persistAllocations(check.allocations!, check.schedulerData!.todayKey);

    return NextResponse.json({
      success: true,
      suggestedDates: check.suggestedDates,
    });
  } catch (err) {
    console.error("[accept order] error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to accept order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
