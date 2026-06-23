export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/adminAuth";
import { getAdminProducts } from "@/server/data/admin-products";
import { ProductsPanel } from "./ProductsPanel";

export default async function AdminProductsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/");
  }

  const products = await getAdminProducts();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Products</h1>

      <ProductsPanel products={products} />
    </div>
  );
}
