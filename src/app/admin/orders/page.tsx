export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { isAdminAuthenticated } from "@/adminAuth";
import { OrdersPanel } from "./OrdersPanel";
import { loadOrdersAction } from "./actions";

export default async function AdminOrdersPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/");
  }
  const defaultTab = "PAYMENT_VERIFICATION";
  const orders = await loadOrdersAction(defaultTab);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Orders</h1>
      <div className="mt-8">
        <OrdersPanel initialOrders={orders} initialTab={defaultTab} />
      </div>
    </div>
  );
}
