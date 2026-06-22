import "server-only";

import { prisma } from "@/lib/prisma";

export async function getTrackableOrder({
  orderNumber,
  mobileNo,
  userId,
}: {
  orderNumber?: string;
  mobileNo?: string;
  userId?: string | null;
}) {
  if (!orderNumber || (!mobileNo && !userId)) return null;

  const order = await prisma.order.findFirst({
    where: {
      orderNumber: orderNumber.toUpperCase(),
      ...(userId ? { userId } : { user: { is: { mobileNo } } }),
    },
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
  });

  if (!order) return null;
  return {
    ...order,
    paymentStatus: order.payments[0]?.status ?? "PENDING",
    createdAt: order.createdAt.toISOString(),
    shippingDate: order.shippingDate?.toISOString() ?? null,
    occasionDate: order.occasionDate?.toISOString() ?? null,
    deliveryDate:
      (order.deliveryDate ?? order.occasionDate)?.toISOString() ?? null,
    items: order.items.map((item) => ({
      ...item,
      product: {
        ...item.product,
        productionDays: item.product.productionDays.toNumber(),
      },
    })),
  };
}

export function getOrderForPayment(orderId: string, userId: string) {
  return prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
      status: { in: ["ACCEPTED", "PAYMENT_PENDING", "PAYMENT_REJECTED"] },
    },
    select: {
      id: true,
      orderNumber: true,
      // user: { select: { mobileNo: true } },
    },
  });
}
export async function getUserOrders(userId: string) {
  const orders = await prisma.order.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      createdAt: true,
      occasionDate: true,
      total: true,

      items: {
        take: 1,
        select: {
          // quantity: true,
          // total: true,
          // deliveryDate: true,
          product: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return orders.map((order) => ({
    ...order,
    createdAt: order.createdAt.toISOString(),
    occasionDate: order.occasionDate?.toISOString() ?? null,
  }));
}

export async function getOrderDetails(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    select: {
      id: true,
      orderNumber: true,
      productionDeadline: true,
      status: true,
      createdAt: true,
      shippingDate: true,
      occasionDate: true,
      deliveryDate: true,
      total: true,
      trackingNumber: true,

      payments: {
        select: {
          status: true,
          screenshotUrl: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },

      items: {
        select: {
          quantity: true,
          product: {
            select: {
              name: true,
              productionDays: true,
            },
          },
        },
      },
      user: {
        select: {
          mobileNo: true,
          id: true,
        },
      },
    },
  });

  if (!order) return null;

  return {
    ...order,
    paymentStatus: order.payments[0]?.status ?? "PENDING",

    createdAt: order.createdAt.toISOString(),
    productionDeadline: order.productionDeadline?.toISOString() ?? null,
    shippingDate: order.shippingDate?.toISOString() ?? null,
    occasionDate: order.occasionDate?.toISOString() ?? null,
    deliveryDate: order.deliveryDate?.toISOString() ?? null,

    items: order.items.map((item) => ({
      ...item,
      product: {
        ...item.product,
        productionDays: item.product.productionDays.toNumber(),
      },
    })),
  };
}
