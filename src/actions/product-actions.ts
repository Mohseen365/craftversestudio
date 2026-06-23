"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/adminAuth";
import { productSchema } from "@/server/schemas/product";
import { slugify } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function createProduct(formData: FormData) {
  await requireAdmin();

  const parsed = productSchema.parse({
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description"),
    price: formData.get("price"),
    productionHours: formData.get("productionHours"),
    imageUrl: formData.get("imageUrl"),
    instagramUrl: formData.get("instagramUrl"),
    active: true,
  });

  const slug = slugify(parsed.name);

  const existing = await prisma.product.findUnique({
    where: { slug },
  });

  const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

  await prisma.product.create({
    data: {
      ...parsed,
      slug: finalSlug,
    },
  });

  revalidatePath("/admin/products");
}
