"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

import { isAdminAuthenticated } from "@/adminAuth";
import { rebuildSchedule } from "@/lib/scheduler";
import {
  calculateProductionDeadline,
  calculateShippingDate,
} from "@/lib/capacity";
import {
  checkAcceptability,
  persistAllocations,
  getSchedulerData,
  formatDateKey,
} from "@/lib/scheduler";
import { SCHEDULABLE_STATUSES, INACTIVE_STATUSES } from "@/lib/constants";
import type { Prisma, OrderStatus as PrismaOrderStatus } from "@prisma/client";

// ============================================================
// TYPES
// ============================================================

type OrderStatus = PrismaOrderStatus;

type PrismaOrderPayload = Prisma.OrderGetPayload<{
  select: typeof orderSelect;
}>;

export interface SerializedOrder {
  id: string;
  orderNumber: string;
  status: string;
  occasionDate: string | null;
  deliveryDate: string | null;
  productionDeadline: string | null;
  shippingDate: string | null;
  shippingDurationDays: number | null;
  customizationCharge: number | null;
  deliveryCharge: number | null;
  urgentOrderCharge: number | null;
  subtotal: number | null;
  total: number | null;
  trackingNumber: string | null;
  quantity: number;
  user: {
    name: string | null;
    mobileNo: string | null;
    email: string | null;
    addresses: Array<{
      address: string;
      city: string;
      state: string;
      pincode: string;
    }>;
  };
  items: Array<{
    quantity: number;
    product: {
      name: string;
      productionHours: number;
    };
  }>;
  payments: Array<{
    screenshotUrl: string | null;
    status: string;
  }>;
  maxProductionDays?: number;
}
export interface AcceptOrderParams {
  shippingDurationDays: number;
  customizationCharge: number;
  deliveryCharge: number;
  urgentOrderCharge: number;
}
export interface CapacityResult {
  canAccept: boolean;
  reason?: string;
  suggestedDates: Array<{ date: string; hours: number }>;
  requiredCapacity: number;
  productionDeadline: string;
}

// ============================================================
// SHARED SELECT
// ============================================================

const orderSelect = {
  id: true,
  orderNumber: true,
  status: true,
  occasionDate: true,
  deliveryDate: true,
  productionDeadline: true,
  shippingDate: true,
  shippingDurationDays: true,
  customizationCharge: true,
  deliveryCharge: true,
  urgentOrderCharge: true,
  subtotal: true,
  total: true,
  trackingNumber: true,
  quantity: true,
  user: {
    select: {
      name: true,
      mobileNo: true,
      email: true,
      addresses: {
        select: {
          address: true,
          city: true,
          state: true,
          pincode: true,
        },
      },
    },
  },
  items: {
    select: {
      quantity: true,
      product: {
        select: {
          name: true,
          productionHours: true,
        },
      },
    },
  },
  payments: {
    select: {
      screenshotUrl: true,
      status: true,
    },
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 1,
  },
} satisfies Prisma.OrderSelect;

// ============================================================
// SERIALIZER
// ============================================================

function serializeOrders(orders: PrismaOrderPayload[]): SerializedOrder[] {
  return orders.map((o) => {
    const maxProductionDays = Math.max(
      1,
      ...o.items.map((item) => item.product.productionHours.toNumber()),
    );

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      occasionDate: o.occasionDate?.toISOString() ?? null,
      productionDeadline: o.productionDeadline?.toISOString() ?? null,
      shippingDate: o.shippingDate?.toISOString() ?? null,
      deliveryDate: o.deliveryDate?.toISOString() ?? null,
      shippingDurationDays: o.shippingDurationDays,
      customizationCharge: o.customizationCharge,
      deliveryCharge: o.deliveryCharge,
      urgentOrderCharge: o.urgentOrderCharge,
      subtotal: o.subtotal,
      total: o.total,
      trackingNumber: o.trackingNumber,
      quantity: o.quantity,
      maxProductionDays,
      user: {
        name: o.user.name,
        mobileNo: o.user.mobileNo,
        email: o.user.email,
        addresses: o.user.addresses.map((a) => ({
          address: a.address,
          city: a.city,
          state: a.state,
          pincode: a.pincode,
        })),
      },
      items: o.items.map((i) => ({
        quantity: i.quantity,
        product: {
          name: i.product.name,
          productionHours: i.product.productionHours.toNumber(),
        },
      })),
      payments: o.payments.map((p) => ({
        screenshotUrl: p.screenshotUrl,
        status: p.status,
      })),
    };
  });
}

// ============================================================
// HELPER: scheduling affected check
// ============================================================

function schedulingAffected(fromStatus: string, toStatus: string): boolean {
  const wasSchedulable = (SCHEDULABLE_STATUSES as readonly string[]).includes(
    fromStatus,
  );
  const isSchedulable = (SCHEDULABLE_STATUSES as readonly string[]).includes(
    toStatus,
  );
  const wasInactive = (INACTIVE_STATUSES as readonly string[]).includes(
    fromStatus,
  );
  const isInactive = (INACTIVE_STATUSES as readonly string[]).includes(
    toStatus,
  );
  return wasSchedulable !== isSchedulable || wasInactive !== isInactive;
}

// ============================================================
// ACTIONS
// ============================================================

export async function loadOrdersAction(
  status: string,
): Promise<SerializedOrder[]> {
  if (!(await isAdminAuthenticated())) {
    redirect("/");
  }

  const orders = await prisma.order.findMany({
    where: status ? { status: status as OrderStatus } : undefined,
    select: orderSelect,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return serializeOrders(orders);
}

export async function updateOrderAction(
  orderId: string,
  body: {
    status?: string;
    verifyPayment?: boolean;
    rejectPayment?: boolean;
    trackingNumber?: string;
  },
) {
  if (!(await isAdminAuthenticated())) {
    redirect("/");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // --- Verify payment: PAYMENT_VERIFICATION → CONFIRMED ---
  if (body.verifyPayment) {
    await prisma.$transaction([
      prisma.payment.updateMany({
        where: { orderId, status: "UPLOADED" },
        data: { status: "VERIFIED", verifiedAt: new Date() },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: "CONFIRMED" },
      }),
    ]);
    revalidatePath("/admin/orders");
    return { success: true, status: "CONFIRMED" };
  }

  // --- Reject payment: PAYMENT_VERIFICATION → PAYMENT_REJECTED ---
  if (body.rejectPayment) {
    await prisma.$transaction([
      prisma.payment.updateMany({
        where: { orderId, status: "PENDING" },
        data: { status: "REJECTED" },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: "PAYMENT_REJECTED" },
      }),
    ]);
    await rebuildSchedule();
    revalidatePath("/admin/orders");
    return { success: true, status: "PAYMENT_REJECTED" };
  }

  // --- Generic status / trackingNumber update ---
  const data: Prisma.OrderUpdateInput = {};

  if (body.status) {
    data.status = body.status as OrderStatus;
  }
  if (body.trackingNumber) {
    data.trackingNumber = body.trackingNumber;
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data,
  });

  if (body.status && schedulingAffected(order.status, body.status)) {
    await rebuildSchedule();
  }

  revalidatePath("/admin/orders");
  return { order: updated };
}
export async function acceptOrderAction(
  orderId: string,
  params: {
    shippingDurationDays: number;
    customizationCharge: number;
    deliveryCharge: number;
    urgentOrderCharge: number;
  },
) {
  if (!(await isAdminAuthenticated())) {
    redirect("/");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      occasionDate: true,
      subtotal: true,
      items: {
        select: {
          quantity: true,
          product: { select: { productionHours: true } },
        },
      },
    },
  });

  if (!order) throw new Error("Order not found");
  if (!order.occasionDate)
    throw new Error("Order needs an occasion date before acceptance");
  if (order.status !== "PENDING_REVIEW")
    throw new Error("Only orders in PENDING_REVIEW can be accepted");

  const shippingDate = calculateShippingDate(
    order.occasionDate,
    params.shippingDurationDays,
  );
  const productionDeadline = calculateProductionDeadline(shippingDate);
  const requiredCapacity = order.items.reduce(
    (sum, item) =>
      sum + item.quantity * item.product.productionHours.toNumber(),
    0,
  );

  // Load scheduler data
  const schedulerData = await getSchedulerData(formatDateKey(new Date()));

  const check = await checkAcceptability(
    {
      id: order.id,
      orderNumber: order.orderNumber,
      productionDeadline,
      requiredHours: requiredCapacity,
    },
    schedulerData,
  );

  if (!check.canAccept) {
    throw new Error(
      check.reason ??
        "Accepting this order exceeds available production capacity",
    );
  }

  // Persist the order status update
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "ACCEPTED",
      shippingDurationDays: params.shippingDurationDays,
      customizationCharge: params.customizationCharge,
      deliveryCharge: params.deliveryCharge,
      urgentOrderCharge: params.urgentOrderCharge,
      total:
        (order.subtotal ?? 0) +
        params.customizationCharge +
        params.deliveryCharge +
        params.urgentOrderCharge,
      shippingDate,
      productionDeadline,
      payments: {
        updateMany: { where: {}, data: { status: "PENDING" } },
      },
    },
  });

  // Persist allocations
  await persistAllocations(check.allocations!, check.schedulerData!.todayKey);

  revalidatePath("/admin/orders");
  return {
    success: true,
    suggestedDates: check.suggestedDates,
  };
}

export async function checkCapacityAction(
  orderId: string,
  productionDeadline: string,
): Promise<CapacityResult> {
  if (!(await isAdminAuthenticated())) {
    redirect("/");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      items: {
        select: {
          quantity: true,
          product: { select: { productionHours: true } },
        },
      },
    },
  });

  if (!order) throw new Error("Order not found");

  const requiredCapacity = order.items.reduce(
    (sum, item) =>
      sum + item.quantity * item.product.productionHours.toNumber(),
    0,
  );

  const schedulerData = await getSchedulerData(formatDateKey(new Date()));

  const check = await checkAcceptability(
    {
      id: order.id,
      orderNumber: order.orderNumber,
      productionDeadline: new Date(productionDeadline),
      requiredHours: requiredCapacity,
    },
    schedulerData,
  );

  return {
    canAccept: check.canAccept,
    reason: check.reason ?? undefined,
    suggestedDates: check.suggestedDates ?? [],
    requiredCapacity,
    productionDeadline,
  };
}
