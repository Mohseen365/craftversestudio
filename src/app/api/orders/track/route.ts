import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrderDeadlines } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const orderNumber = req.nextUrl.searchParams.get("orderNumber");
  const mobileNo = req.nextUrl.searchParams.get("mobileNo");

  if (!orderNumber && !mobileNo) {
    return NextResponse.json(
      { error: "Provide order number or Mobile No" },
      { status: 400 }
    );
  }

  const order = await prisma.order.findFirst({
    where: orderNumber
      ? { orderNumber: orderNumber.toUpperCase() }
      : { user: { mobileNo: mobileNo! } },
    include: {
      payments: true,
      items: {
        include: {
          product: { select: { name: true, productionDays: true } },
        },
      },
      user: { select: { mobileNo: true, id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const paymentStatus = order.payments[0]?.status ?? "PENDING";
  const maxProductionDays = Math.max(
    1,
    ...order.items.map((item) => item.product.productionDays)
  );
  const deliveryDate = order.deliveryDate ?? order.occasionDate;
  const deadlines = getOrderDeadlines(deliveryDate, maxProductionDays);

  return NextResponse.json({
    order: {
      ...order,
      paymentStatus,
      deliveryDate,
      ...deadlines,
    },
  });
}
