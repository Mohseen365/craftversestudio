import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/utils";
import { getCurrentUserId } from "@/lib/auth";

const orderSchema = z.object({
  userId: z.string(),
  productId: z.string(),
  address: z.string().min(5),
  city: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  state: z.string().min(2),
  occasionType: z.string().optional(),
  occasionDate: z.coerce.date(),
  quantity: z.number().int().min(1).max(10),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const data = orderSchema.parse(await req.json());

    // Verify the userId in the request matches the authenticated session.
    // This prevents one customer from attaching orders to another account.
    const sessionUserId = await getCurrentUserId();
    if (sessionUserId !== data.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const product = await prisma.product.findUnique({
      where: { id: data.productId, active: true },
      select: { id: true, name: true, price: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const subtotal = product.price * data.quantity;
    const orderNumber = generateOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      await tx.address.create({
        data: {
          userId: data.userId,
          address: data.address,
          city: data.city,
          pincode: data.pincode,
          state: data.state,
        },
      });

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: data.userId,
          status: "PENDING_REVIEW",
          occasionType: data.occasionType,
          // occasionDate: data.occasionDate ? new Date(data.occasionDate) : null,
          occasionDate: data.occasionDate,
          quantity: data.quantity,
          subtotal,
          total: subtotal,
          notes: data.notes,
          items: {
            create: {
              productId: product.id,
              quantity: data.quantity,
              price: product.price,
            },
          },
        },
      });

      await tx.product.update({
        where: { id: product.id },
        data: { orderCount: { increment: 1 } },
      });

      return newOrder;
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid order data" },
        { status: 400 },
      );
    }
    console.error(err);
    const message =
      err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
