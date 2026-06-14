import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reserveCapacity } from "@/lib/capacity";
import { toDateOnly } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const capacityDate = order.deliveryDate ?? order.occasionDate;
  if (!capacityDate) {
    return NextResponse.json(
      { error: "Order needs a delivery or occasion date before acceptance" },
      { status: 400 }
    );
  }

  const existingReservation = await prisma.capacityReservation.findUnique({
    where: { orderId: id },
  });

  if (!existingReservation) {
    try {
      await reserveCapacity(toDateOnly(capacityDate), id, order.quantity);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Not enough capacity for this date";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  await prisma.order.update({
    where: { id },
    data: {
      status: "ACCEPTED",
      deliveryDate: capacityDate,
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

  return NextResponse.json({ success: true });
}
