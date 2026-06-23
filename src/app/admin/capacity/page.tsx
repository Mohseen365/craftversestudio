export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/adminAuth";
import { CapacityPanel } from "./CapacityPanel";
import { getSchedulerPlanningRows } from "@/lib/scheduler";

export default async function AdminCapacityPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/");
  }

  const rows = await getSchedulerPlanningRows();
  const serializedRows = rows.map((row) => ({
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
          allocatedToday: res.hours ?? res.quantity,
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
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">
        Production planning
      </h1>
      <p className="mt-2 text-stone-500">
        Review future production deadlines and accepted-order workload.
      </p>
      <div className="mt-8">
        <CapacityPanel initialData={serializedRows} />
      </div>
    </div>
  );
}
