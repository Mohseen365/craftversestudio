// src/app/api/admin/capacity/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/adminAuth";
import {
  checkAcceptability,
  getSchedulerPlanningRows,
  calculateOrderHours,
} from "@/lib/scheduler";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const productionDeadline = req.nextUrl.searchParams.get("productionDeadline");
  const orderId = req.nextUrl.searchParams.get("orderId") ?? undefined;

  // Check acceptability of a specific order
  if (productionDeadline && orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        orderNumber: true,
        items: {
          select: {
            quantity: true,
            product: { select: { productionHours: true } },
          },
        },
      },
    });

    if (order) {
      const requiredHours = calculateOrderHours(order.items);

      const check = await checkAcceptability({
        id: orderId,
        orderNumber: order.orderNumber,
        productionDeadline: new Date(productionDeadline),
        requiredHours,
      });

      return NextResponse.json({
        capacity: {
          canAccept: check.canAccept,
          reason: check.reason,
          suggestedDates: check.suggestedDates,
          requiredHours,
          productionDeadline: new Date(productionDeadline).toISOString(),
        },
      });
    }
  }

  // Get full planning data
  const rows = await getSchedulerPlanningRows();

  return NextResponse.json({
    capacities: rows.map((row) => ({
      date: row.date.toISOString(),
      dailyCapacity: row.dailyCapacity,
      used: row.used,
      remaining: row.remaining,
      isFull: row.isFull,
      orders: row.reservations
        .filter((res) => !res.isManual)
        .map((res) => {
          const order = res.order;
          const totalRequiredEffort = order.items.reduce(
            (sum, item) =>
              sum + item.quantity * item.product.productionHours.toNumber(),
            0,
          );
          const completedEffort = order.capacityReservations.reduce(
            (sum, r) => sum + Number(r.completedHours),
            0,
          );
          return {
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.user.name,
            occasionDate: order.occasionDate?.toISOString() ?? null,
            address: order.user.addresses[0]
              ? [
                  order.user.addresses[0].address,
                  order.user.addresses[0].city,
                  order.user.addresses[0].state,
                  order.user.addresses[0].pincode,
                ]
                  .filter(Boolean)
                  .join(", ")
              : "",
            allocatedToday: res.hours, // FIXED: use hours directly
            totalRequiredEffort,
            completedEffort,
            remainingEffort: Math.max(0, totalRequiredEffort - completedEffort),
            shippingDurationDays: order.shippingDurationDays,
            shippingDate: order.shippingDate?.toISOString() ?? null,
            productionDeadline: order.productionDeadline?.toISOString() ?? null,
            status: order.status,
            items: order.items.map((item) => ({
              productName: item.product.name,
              quantity: item.quantity,
              productionHours: item.product.productionHours.toNumber(),
            })),
          };
        }),
    })),
  });
}
