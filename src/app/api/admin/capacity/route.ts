import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCapacityForDeadline, getPlanningRows } from "@/lib/capacity";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const productionDeadline = req.nextUrl.searchParams.get("productionDeadline");
  const quantity = Number(req.nextUrl.searchParams.get("quantity") ?? 0);
  const orderId = req.nextUrl.searchParams.get("orderId") ?? undefined;

  if (productionDeadline) {
    const capacity = await getCapacityForDeadline(
      new Date(productionDeadline),
      Number.isFinite(quantity) ? quantity : 0,
      orderId
    );
    return NextResponse.json({
      capacity: {
        ...capacity,
        productionDeadline: capacity.productionDeadline.toISOString(),
      },
    });
  }

  const rows = await getPlanningRows();

  return NextResponse.json({
    capacities: rows.map((row) => ({
      date: row.date.toISOString(),
      dailyCapacity: row.dailyCapacity,
      used: row.used,
      remaining: row.remaining,
      isFull: row.isFull,
      orders: row.orders.map((order) => ({
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
        bouquetQuantity: order.quantity,
        shippingDurationDays: order.shippingDurationDays,
        shippingDate: order.shippingDate?.toISOString() ?? null,
        productionDeadline: order.productionDeadline?.toISOString() ?? null,
        status: order.status,
        items: order.items.map((item) => ({
          productName: item.product.name,
          quantity: item.quantity,
          productionDays: item.product.productionDays,
        })),
      })),
    })),
  });
}
