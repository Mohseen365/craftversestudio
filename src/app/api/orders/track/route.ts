import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTrackableOrder } from "@/server/data/orders";

export async function GET(req: NextRequest) {
  const orderNumber = req.nextUrl.searchParams.get("orderNumber");
  const mobileNo = req.nextUrl.searchParams.get("mobileNo");

  if (!orderNumber) {
    return NextResponse.json(
      { error: "Provide an order number" },
      { status: 400 },
    );
  }

  const session = await auth();

  const userId = session?.user?.id;
  const order = await getTrackableOrder({
    orderNumber,
    mobileNo: mobileNo ?? undefined,
    userId,
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}
