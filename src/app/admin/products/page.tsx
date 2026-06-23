export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { isAdminAuthenticated } from "@/adminAuth";
import { ProductsPanel } from "./ProductsPanel";
import { prisma } from "@/lib/prisma";

export default async function AdminProductsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/");
  }
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      productionHours: true,
      active: true,
      imageUrl: true,
      instagramUrl: true,
      orderCount: true,
      slug: true,
      description: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedProducts = products.map((p) => ({
    ...p,
    productionHours: p.productionHours.toNumber(),
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Products</h1>
      <div className="mt-8">
        <ProductsPanel initialProducts={serializedProducts} />
      </div>
    </div>
  );
}
