export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

export default async function AdminDashboardPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    revenueToday,
    revenueMonth,
    ordersMonth,
    topProduct,
    pending,
    inProduction,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfDay },
        status: {
          notIn: [
            "CANCELLED",
            "REFUNDED",
            "PENDING_REVIEW",
            "PAYMENT_PENDING",
            "REJECTED",
            "PAYMENT_REJECTED",
          ],
        },
      },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfMonth },
        status: {
          notIn: [
            "CANCELLED",
            "REFUNDED",
            "PENDING_REVIEW",
            "PAYMENT_PENDING",
            "REJECTED",
            "PAYMENT_REJECTED",
          ],
        },
      },
      _sum: { total: true },
    }),
    prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.product.findFirst({
      where: { active: true },
      orderBy: { orderCount: "desc" },
      select: { name: true },
    }),
    prisma.order.count({ where: { status: "PAYMENT_VERIFICATION" } }),
    prisma.order.count({
      where: {
        status: { in: ["CONFIRMED", "IN_PRODUCTION", "READY_TO_SHIP"] },
      },
    }),
  ]);

  const stats = [
    {
      label: "Revenue today",
      value: formatPrice(revenueToday._sum.total ?? 0),
    },
    {
      label: "Revenue this month",
      value: formatPrice(revenueMonth._sum.total ?? 0),
    },
    { label: "Orders this month", value: String(ordersMonth) },
    { label: "Top selling bouquet", value: topProduct?.name ?? "—" },
    { label: "Pending payment verification", value: String(pending) },
    { label: "In production queue", value: String(inProduction) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Overview</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm text-stone-500">{s.label}</p>
            <p className="mt-2 text-2xl font-semibold text-stone-900">
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
