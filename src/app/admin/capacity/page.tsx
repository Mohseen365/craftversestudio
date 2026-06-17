export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { CapacityPanel } from "./CapacityPanel";

export default async function AdminCapacityPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Production planning</h1>
      <p className="mt-2 text-stone-500">
        Review future production deadlines and accepted-order workload.
      </p>
      <div className="mt-8">
        <CapacityPanel />
      </div>
    </div>
  );
}
