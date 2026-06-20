import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/utils";
import { getOrCreateCustomerId } from "@/lib/auth";

const orderSchema = z.object({
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
    console.log("in orders/route");

    const data = orderSchema.parse(await req.json());
    console.log("in orders/route parsed request and going to find product");
    // Price and active status are authoritative at mutation time, not from cached page data.
    const product = await prisma.product.findUnique({
      where: { id: data.productId, active: true },
      select: { id: true, name: true, price: true },
    });
    if (!product) {
      console.log("in orders/route product not found");
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    console.log(
      "in orders/route product found and goint to getOrCreateCustomerId",
    );
    const customerId = await getOrCreateCustomerId();
    console.log("out of getOrCreateCustomerId");

    const subtotal = product.price * data.quantity;
    const orderNumber = generateOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      console.log("creating address");

      await tx.address.create({
        data: {
          userId: customerId,
          address: data.address,
          city: data.city,
          pincode: data.pincode,
          state: data.state,
        },
      });
      console.log("creating order");

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: customerId,
          status: "PENDING_REVIEW",
          occasionType: data.occasionType,
          // occasionDate: data.occasionDate ? new Date(data.occasionDate) : null,
          occasionDate: data.occasionDate,
          shippingDate: data.occasionDate,
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
      console.log(newOrder.id);

      console.log("updating product");

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
    console.log("in catch block of order api");

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
