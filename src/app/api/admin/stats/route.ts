import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [revenueToday, revenueMonth, ordersMonth, topProduct] = await Promise.all([
    prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfDay },
        status: { notIn: ["CANCELLED", "REFUNDED", "PAYMENT_PENDING"] },
      },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfMonth },
        status: { notIn: ["CANCELLED", "REFUNDED", "PAYMENT_PENDING"] },
      },
      _sum: { total: true },
    }),
    prisma.order.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
    prisma.product.findFirst({
      where: { active: true },
      orderBy: { orderCount: "desc" },
      select: { name: true, orderCount: true },
    }),
  ]);

  const pendingVerification = await prisma.order.count({
    where: { status: "PAYMENT_VERIFICATION" },
  });

  const inProduction = await prisma.order.count({
    where: { status: { in: ["CONFIRMED", "IN_PRODUCTION", "READY_TO_SHIP"] } },
  });

  return NextResponse.json({
    revenueToday: revenueToday._sum.total ?? 0,
    revenueMonth: revenueMonth._sum.total ?? 0,
    ordersMonth,
    topProduct: topProduct?.name ?? "—",
    pendingVerification,
    inProduction,
  });
}
