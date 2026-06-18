import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const orderNumber = req.nextUrl.searchParams.get("orderNumber");
  const mobileNo = req.nextUrl.searchParams.get("mobileNo");

  if (!orderNumber && !mobileNo) {
    return NextResponse.json(
      { error: "Provide order number or Mobile No" },
      { status: 400 },
    );
  }

  const order = await prisma.order.findFirst({
    where: orderNumber
      ? { orderNumber: orderNumber.toUpperCase() }
      : { user: { mobileNo: mobileNo! } },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      createdAt: true,
      shippingDate: true,
      occasionDate: true,
      deliveryDate: true,
      total: true,
      trackingNumber: true,
      payments: {
        select: { status: true, screenshotUrl: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      items: {
        select: {
          quantity: true,
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

  return NextResponse.json({
    order: {
      ...order,
      paymentStatus,
      deliveryDate: order.deliveryDate ?? order.occasionDate,
    },
  });
}
