import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { checkAcceptability, getSchedulerPlanningRows } from "@/lib/scheduler";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const productionDeadline = req.nextUrl.searchParams.get("productionDeadline");
  const orderId = req.nextUrl.searchParams.get("orderId") ?? undefined;

  if (productionDeadline && orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { select: { productionDays: true } },
          },
        },
      },
    });

    if (order) {
      const requiredCapacity = order.items.reduce(
        (sum, item) => sum + item.quantity * Math.max(1, item.product.productionDays),
        0
      );

      const check = await checkAcceptability({
        id: orderId,
        orderNumber: order.orderNumber,
        productionDeadline: new Date(productionDeadline),
        requiredCapacity,
      });

      return NextResponse.json({
        capacity: {
          canAccept: check.canAccept,
          reason: check.reason,
          suggestedDates: check.suggestedDates,
          requiredCapacity,
          productionDeadline: new Date(productionDeadline).toISOString(),
        },
      });
    }
  }

  const rows = await getSchedulerPlanningRows();

  return NextResponse.json({
    capacities: rows.map((row) => ({
      date: row.date.toISOString(),
      dailyCapacity: row.dailyCapacity,
      used: row.used,
      remaining: row.remaining,
      isFull: row.isFull,
      orders: row.reservations.map((res) => {
        const order = res.order;
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.user.name,
          occasionDate: order.occasionDate?.toISOString() ?? null,
          address: order.user.addresses[0]
            ? [
                order.user.addresses[0].address,
                order.user.addresses[0].city,
                order.user.addresses[0].state,
                order.user.addresses[0].pincode,
              ]
                .filter(Boolean)
                .join(", ")
            : "",
          bouquetQuantity: res.quantity,
          shippingDurationDays: order.shippingDurationDays,
          shippingDate: order.shippingDate?.toISOString() ?? null,
          productionDeadline: order.productionDeadline?.toISOString() ?? null,
          status: order.status,
          items: order.items.map((item) => ({
            productName: item.product.name,
            quantity: item.quantity,
            productionDays: item.product.productionDays,
          })),
        };
      }),
    })),
  });
}
