import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber, toDateOnly } from "@/lib/utils";
// import { isDateAvailable, reserveCapacity } from "@/lib/capacity";
// import { notifyAdminNewOrder } from "@/lib/email";

const orderSchema = z.object({
  userId: z.string(),
  productId: z.string(),
  // fullName: z.string().min(2),
  // instagramUsername: z.string().optional(),
  // mobileNo: z.string().min(10),
  // email: z.string().email().optional().or(z.literal("")),
  address: z.string().min(5),
  city: z.string().min(2),
  pincode: z.string().min(4),
  state: z.string().min(2),
  occasionType: z.string().optional(),
  occasionDate: z.string().nullable().optional(),
  // deliveryDate: z.string(),
  quantity: z.number().int().min(1).max(10),
  // giftMessage: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = orderSchema.parse({
      ...body,
      quantity: Number(body.quantity),
    });

    const product = await prisma.product.findUnique({
      where: { id: data.productId, active: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // const deliveryDate = toDateOnly(new Date(data.deliveryDate));
    // const available = await isDateAvailable(deliveryDate, data.quantity);
    // if (!available) {
    //   return NextResponse.json(
    //     { error: "Selected date is full. Please choose another date." },
    //     { status: 400 }
    //   );
    // }

    const subtotal = product.price * data.quantity;
    const orderNumber = generateOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      // const user = await tx.user.create({
      //   data: {
      //     name: data.fullName,
      //     instagramUsername: data.instagramUsername || null,
      //     mobileNo: data.mobileNo,
      //     email: data.email || null,
      //   },
      // });

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
          occasionDate: data.occasionDate ? new Date(data.occasionDate) : null,
          // deliveryDate,
          quantity: data.quantity,
          subtotal,
          total: subtotal,
          // giftMessage: data.giftMessage,
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

    // await reserveCapacity(deliveryDate, order.id, data.quantity);
    // await notifyAdminNewOrder(orderNumber, data.fullName);

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: data.userId,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid order data" },
        { status: 400 }
      );
    }
    console.error(err);
    const message =
      err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
