import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  calculateProductionDeadline,
  calculateShippingDate,
} from "@/lib/capacity";
import { checkAcceptability, rebuildSchedule } from "@/lib/scheduler";
import { requireAdmin } from "@/lib/auth";

const acceptSchema = z.object({
  shippingDurationDays: z.number().int().min(0),
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
        include: {
          product: { select: { productionDays: true } },
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
      { status: 400 }
    );
  }

  const shippingDate = calculateShippingDate(
    order.occasionDate,
    body.data.shippingDurationDays
  );
  const productionDeadline = calculateProductionDeadline(shippingDate);
  const requiredCapacity = order.items.reduce(
    (sum, item) =>
      // sum + item.quantity * Math.max(1, item.product.productionDays),
      sum + item.quantity * item.product.productionDays.toNumber(),
    0
  );

  const check = await checkAcceptability({
    id: order.id,
    orderNumber: order.orderNumber,
    productionDeadline,
    requiredCapacity,
  });

  if (!check.canAccept) {
    return NextResponse.json(
      {
        error:
          check.reason ??
          "Accepting this order exceeds available production capacity",
      },
      { status: 409 }
    );
  }

  await prisma.order.update({
    where: { id },
    data: {
      status: "ACCEPTED",
      shippingDurationDays: body.data.shippingDurationDays,
      shippingDate: shippingDate,
      productionDeadline: productionDeadline,
      occasionDate: order.occasionDate,
      payments: {
        updateMany: {
          where: {},
          data: {
            status: "PENDING",
          },
        },
      },
    },
  });

  // Rebuild the production schedule now that the order is accepted
  await rebuildSchedule();

  return NextResponse.json({
    success: true,
    suggestedDates: check.suggestedDates,
  });
}
