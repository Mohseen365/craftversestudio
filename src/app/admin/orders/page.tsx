export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { OrdersPanel } from "./OrdersPanel";
import { prisma } from "@/lib/prisma";

export default async function AdminOrdersPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const defaultTab = "PAYMENT_VERIFICATION";
  const orders = await prisma.order.findMany({
    where: { status: defaultTab as never },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      occasionDate: true,
      deliveryDate: true,
      productionDeadline: true,
      shippingDate: true,
      shippingDurationDays: true,
      total: true,
      trackingNumber: true,
      quantity: true,
      user: {
        select: {
          name: true,
          mobileNo: true,
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
          product: { select: { name: true, productionDays: true } },
        },
      },
      payments: {
        select: { screenshotUrl: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serializedOrders = orders.map((o) => ({
    ...o,
    occasionDate: o.occasionDate?.toISOString() ?? null,
    productionDeadline: o.productionDeadline?.toISOString() ?? null,
    shippingDate: o.shippingDate?.toISOString() ?? null,
    items: o.items.map((i) => ({
      ...i,
      product: {
        ...i.product,
        productionDays: i.product.productionDays.toNumber(),
      },
    })),
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Orders</h1>
      <div className="mt-8">
        <OrdersPanel initialOrders={serializedOrders as any} initialTab={defaultTab} />
      </div>
    </div>
  );
}
