import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { ProductsPanel } from "./ProductsPanel";

export default async function AdminProductsPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Products</h1>
      <div className="mt-8">
        <ProductsPanel />
      </div>
    </div>
  );
}
