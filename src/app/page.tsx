export const dynamic = "force-dynamic";

import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { getCurrentUser } from "@/lib/auth";
import { trackEvent } from "@/lib/eventLogger";

export default async function HomePage() {
  const [user, featured] = await Promise.all([
    getCurrentUser().catch(() => null),
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
  ]);

  trackEvent({
    userId: user?.id,
    eventType: "WEBSITE_OPENED",
    metadata: { source: "homepage" },
  }).catch(() => {});

  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-white to-emerald-50">
          <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-widest text-rose-600">
                Instagram → Order → Delivered
              </p>
              <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight text-stone-900 md:text-5xl">
                Bouquets crafted with care, delivered on your date
              </h1>
              <p className="mt-6 text-lg text-stone-600">
                Browse our catalog, pick your delivery date, upload payment, and
                track your order — no endless DMs required.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/catalog"
                  className="rounded-full bg-rose-700 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-rose-800 transition"
                  prefetch
                >
                  Browse Catalog
                </Link>
                <Link
                  href="/track"
                  className="rounded-full border border-rose-200 bg-white px-6 py-3 text-sm font-medium text-rose-800 hover:bg-rose-50 transition"
                  prefetch
                >
                  Track Order
                </Link>
              </div>
            </div>
          </div>
        </section>

        {featured.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-16">
            <div className="flex items-end justify-between">
              <h2 className="font-serif text-2xl text-stone-900">Popular bouquets</h2>
              <Link href="/catalog" className="text-sm text-rose-700 hover:underline">
                View all
              </Link>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((product) => (
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
          </section>
        )}

        <section className="border-t border-rose-100 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="font-serif text-2xl text-stone-900">How it works</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-4">
              {[
                {
                  step: "1",
                  title: "Browse",
                  desc: "Search and filter bouquets by price",
                },
                {
                  step: "2",
                  title: "Pick a date",
                  desc: "System checks daily capacity automatically",
                },
                {
                  step: "3",
                  title: "Pay & upload",
                  desc: "Upload payment screenshot for verification",
                },
                {
                  step: "4",
                  title: "Track",
                  desc: "Follow status from production to delivery",
                },
              ].map((item) => (
                <li
                  key={item.step}
                  className="rounded-2xl border border-rose-100 p-6"
                >
                  <span className="text-sm font-bold text-rose-600">
                    {item.step}
                  </span>
                  <h3 className="mt-2 font-medium text-stone-900">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">{item.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}