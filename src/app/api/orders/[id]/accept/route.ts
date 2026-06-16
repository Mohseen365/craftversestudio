import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calculateProductionDeadline, calculateShippingDate } from "@/lib/capacity";
import {
  checkAcceptability,
  persistAllocations,
  getSchedulerData,
  formatDateKey,
} from "@/lib/scheduler";
import { requireAdmin } from "@/lib/auth";

const acceptSchema = z.object({
  shippingDurationDays: z.number().min(0).max(365),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = acceptSchema.safeParse(await req.json().catch(() => ({})));

  if (!body.success) {
    return NextResponse.json(
      { error: "Shipping duration is required" },
      { status: 400 }
    );
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: { select: { productionDays: true } } },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!order.occasionDate) {
    return NextResponse.json(
      { error: "Order needs an occasion date before acceptance" },
      { status: 400 }
    );
  }

  if (order.status !== "PENDING_REVIEW") {
    return NextResponse.json(
      { error: "Only orders in PENDING_REVIEW can be accepted" },
      { status: 409 }
    );
  }

  const shippingDate = calculateShippingDate(
    order.occasionDate,
    body.data.shippingDurationDays
  );
  const productionDeadline = calculateProductionDeadline(shippingDate);
  const requiredCapacity = order.items.reduce(
    (sum, item) => sum + item.quantity * item.product.productionDays.toNumber(),
    0
  );

  // Load scheduler data once — shared by checkAcceptability and persistAllocations
  const schedulerData = await getSchedulerData(formatDateKey(new Date(), false));

  const check = await checkAcceptability(
    { id: order.id, orderNumber: order.orderNumber, productionDeadline, requiredCapacity },
    schedulerData
  );

  if (!check.canAccept) {
    return NextResponse.json(
      { error: check.reason ?? "Accepting this order exceeds available production capacity" },
      { status: 409 }
    );
  }

  // Persist the order update
  await prisma.order.update({
    where: { id },
    data: {
      status: "ACCEPTED",
      shippingDurationDays: body.data.shippingDurationDays,
      shippingDate,
      productionDeadline,
      occasionDate: order.occasionDate,
      payments: {
        updateMany: { where: {}, data: { status: "PENDING" } },
      },
    },
  });

  // Reuse the allocation already computed by checkAcceptability — no second DB fetch,
  // no second algorithm run. schedulerData.inputs now includes the newly accepted order.
  await persistAllocations(check.allocations!, check.schedulerData!.todayKey);

  return NextResponse.json({ success: true, suggestedDates: check.suggestedDates });
}
