import { prisma } from "@/lib/prisma";
import { PRODUCT_ADMIN_SELECT } from "@/server/selects/product";
import { serializeProduct } from "@/server/serializers/product";

export async function getAdminProducts() {
  const products = await prisma.product.findMany({
    select: PRODUCT_ADMIN_SELECT,
    orderBy: {
      createdAt: "desc",
    },
  });

  return products.map(serializeProduct);
}
