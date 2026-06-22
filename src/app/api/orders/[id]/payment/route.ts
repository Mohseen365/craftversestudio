import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
// import { getCurrentUserId } from "@/lib/auth";
// import { notifyAdminPaymentPending } from "@/lib/email";

const schema = z.object({
  screenshotUrl: z
    .string()
    .min(1)
    .refine(
      (value) =>
        value.startsWith("/uploads/") || z.url().safeParse(value).success,
      {
        message: "Invalid screenshot URL",
      },
    ),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params; // from /api/orders/[id]/payment
    const userId = req.nextUrl.searchParams.get("userId"); // from ?userId=...

    // now you have both
    const body = schema.parse(await req.json());

    // const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.order.findFirst({
      where: {
        id,
        userId,
        status: { in: ["ACCEPTED", "PAYMENT_PENDING", "PAYMENT_REJECTED"] },
      },
      select: { id: true, status: true, total: true, orderNumber: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "REJECTED") {
      return NextResponse.json(
        { error: "Rejected orders cannot submit payment" },
        { status: 400 },
      );
    }

    if (order.status !== "ACCEPTED" && order.status !== "PAYMENT_PENDING") {
      return NextResponse.json(
        { error: "Payment is only available after admin accepts the order" },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          orderId: id,
          amount: order.total,
          screenshotUrl: body.screenshotUrl,
          status: "UPLOADED",
        },
      }),
      prisma.order.update({
        where: { id },
        data: { status: "PAYMENT_VERIFICATION" },
      }),
    ]);

    // await notifyAdminPaymentPending(order.orderNumber);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to upload payment" },
      { status: 500 },
    );
  }
}
