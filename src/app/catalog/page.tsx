export const dynamic = "force-dynamic";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";
import { PRICE_FILTERS } from "@/lib/utils";
import Link from "next/link";
import { trackEvent } from "@/lib/eventLogger";
// import { getCurrentUser } from "@/lib/auth";
import { getOrCreateCustomer } from "@/lib/auth";

// const user = await getCurrentUser();

type SearchParams = Promise<{
  q?: string;
  price?: string;
  sort?: string;
}>;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const priceFilter = params.price ?? "all";
  const sort = params.sort ?? "newest";

  const priceRange =
    priceFilter === "all"
      ? PRICE_FILTERS[0]
      : PRICE_FILTERS.find((p) => p.label === priceFilter) ?? PRICE_FILTERS[0];

  const products = await prisma.product.findMany({
    where: {
      active: true,
      price: {
        gte: priceRange.min,
        ...(priceRange.max !== Infinity ? { lte: priceRange.max } : {}),
      },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    // include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    orderBy:
      sort === "price-low"
        ? { price: "asc" }
        : sort === "price-high"
        ? { price: "desc" }
        : sort === "best"
        ? { orderCount: "desc" }
        : { createdAt: "desc" },
  });

  void getOrCreateCustomer()
    .then((user) =>
      trackEvent({
        userId: user?.id,
        eventType: "WEBSITE_OPENED",
        metadata: {
          source: "catalog",
        },
      })
    )
    .catch((err) => console.error("Customer creation failed:", err));

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-serif text-3xl text-stone-900">Catalog</h1>
        <p className="mt-2 text-stone-500">
          Find the perfect bouquet for your occasion
        </p>

        <form className="mt-8 flex flex-wrap gap-4" method="GET">
          <input
            name="q"
            value={q}
            placeholder="Search Rose, Tulip, Mini..."
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm min-w-[200px] focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
          />
          <select
            name="price"
            value={priceFilter}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm focus:border-rose-300 focus:outline-none"
          >
            {PRICE_FILTERS.map((p) => (
              <option
                key={p.label}
                value={p.label === "All prices" ? "all" : p.label}
              >
                {p.label}
              </option>
            ))}
          </select>
          <select
            name="sort"
            value={sort}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm focus:border-rose-300 focus:outline-none"
          >
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low → High</option>
            <option value="price-high">Price: High → Low</option>
            <option value="best">Best Sellers</option>
          </select>
          <button
            type="submit"
            className="rounded-xl bg-rose-700 px-5 py-2 text-sm font-medium text-white hover:bg-rose-800"
          >
            Apply
          </button>
          {q || priceFilter !== "all" || sort !== "newest" ? (
            <Link
              href="/catalog"
              className="px-4 py-2 text-sm text-stone-500 hover:text-stone-800"
            >
              Clear
            </Link>
          ) : null}
        </form>

        {products.length === 0 ? (
          <p className="mt-12 text-center text-stone-500">
            No bouquets match your filters.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                slug={product.slug}
                price={product.price}
                category={product.category}
                imageUrl={product.imageUrl}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
