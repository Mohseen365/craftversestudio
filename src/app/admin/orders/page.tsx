export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { OrdersPanel } from "./OrdersPanel";

export default async function AdminOrdersPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Orders</h1>
      <div className="mt-8">
        <OrdersPanel />
      </div>
    </div>
  );
}
