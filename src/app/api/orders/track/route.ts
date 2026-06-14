import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      items: { include: { product: { select: { name: true } } } },
      user: { select: { mobileNo: true, id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}
