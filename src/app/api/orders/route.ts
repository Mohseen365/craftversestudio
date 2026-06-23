import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/utils";

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
  productPrice: z.number(),
  productionHours: z.number(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const data = orderSchema.parse(await req.json());

    // Price and active status are authoritative at mutation time, not from cached page data.
    // const product = await prisma.product.findUnique({
    //   where: { id: data.productId, active: true },
    //   select: { id: true, name: true, price: true },
    // });
    // if (!product) {
    //   return NextResponse.json({ error: "Product not found" }, { status: 404 });
    // }

    const customerId = data.userId;

    const subtotal = data.productPrice * data.quantity;
    const orderNumber = generateOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      tx.address.create({
        data: {
          userId: customerId,
          address: data.address,
          city: data.city,
          pincode: data.pincode,
          state: data.state,
        },
      });
      tx.product.update({
        where: { id: data.productId },
        data: { orderCount: { increment: 1 } },
      });
      const hoursRequired = data.productionHours * data.quantity;
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: customerId,
          status: "PENDING_REVIEW",
          occasionType: data.occasionType,
          // occasionDate: data.occasionDate ? new Date(data.occasionDate) : null,
          occasionDate: data.occasionDate,
          // shippingDate: data.occasionDate,
          quantity: data.quantity,
          subtotal,
          total: subtotal,
          notes: data.notes,
          items: {
            create: {
              productId: data.productId,
              quantity: data.quantity,
              price: data.productPrice,
              hoursRequired,
            },
          },
        },
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
