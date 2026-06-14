import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getOrderDeadlines } from "@/lib/utils";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status");

  const orders = await prisma.order.findMany({
    where: status ? { status: status as never } : undefined,
    include: {
      user: { select: { name: true, mobileNo: true, email: true } },
      items: {
        include: {
          product: { select: { name: true, productionDays: true } },
        },
      },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const ordersWithDeadlines = orders.map((order) => {
    const deliveryDate = order.deliveryDate ?? order.occasionDate;
    const maxProductionDays = Math.max(
      1,
      ...order.items.map((item) => item.product.productionDays)
    );

    return {
      ...order,
      deliveryDate,
      ...getOrderDeadlines(deliveryDate, maxProductionDays),
    };
  });

  return NextResponse.json({ orders: ordersWithDeadlines });
}
