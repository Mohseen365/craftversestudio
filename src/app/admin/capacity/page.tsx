import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { CapacityPanel } from "./CapacityPanel";

export default async function AdminCapacityPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Capacity calendar</h1>
      <p className="mt-2 text-stone-500">Set daily order limits to prevent overbooking</p>
      <div className="mt-8">
        <CapacityPanel />
      </div>
    </div>
  );
}
