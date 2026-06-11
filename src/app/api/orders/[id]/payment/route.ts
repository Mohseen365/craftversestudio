import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyAdminPaymentPending } from "@/lib/email";

const schema = z.object({ screenshotUrl: z.string().url() });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = schema.parse(await req.json());

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          orderId: id,
          amount: order.total,
          screenshotUrl: body.screenshotUrl,
          status: "PENDING",
        },
      }),
      prisma.order.update({
        where: { id },
        data: { status: "PAYMENT_VERIFICATION" },
      }),
    ]);

    await notifyAdminPaymentPending(order.orderNumber);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to upload payment" }, { status: 500 });
  }
}
