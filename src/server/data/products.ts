import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const PRODUCTS_CACHE_TAG = "products";

export const getFeaturedProducts = unstable_cache(
  async () =>
    prisma.product.findMany({
      where: { active: true },
      orderBy: { orderCount: "desc" },
      take: 4,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        category: true,
        imageUrl: true,
      },
    }),
  ["featured-products"],
  { revalidate: 900, tags: [PRODUCTS_CACHE_TAG] },
);

export const getDefaultCatalogProducts = unstable_cache(
  async () =>
    prisma.product.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        category: true,
        imageUrl: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ["default-catalog-products"],
  { revalidate: 900, tags: [PRODUCTS_CACHE_TAG] },
);

export const getProductBySlug = (slug: string) =>
  unstable_cache(
    async () =>
      prisma.product.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          category: true,
          imageUrl: true,
          description: true,
          instagramUrl: true,
          active: true,
          productionHours: true,
        },
      }),
    [`product-by-slug-${slug}`], // unique key per slug
    { revalidate: 3600, tags: [PRODUCTS_CACHE_TAG] },
  )();
