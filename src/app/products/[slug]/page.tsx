export const revalidate = 3600;
// Do not pre-render product pages at build time — generate on first request
// and cache for 1 hour. This avoids hitting the DB during next build, which
// exhausts the single-connection Supabase free-tier pool.
export const dynamicParams = true;

import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { trackEvent } from "@/lib/eventLogger";
import { getCurrentUser } from "@/lib/auth";
import Image from "next/image";

// Return no static params — pages are generated on first request and cached.
// This prevents DB calls at build time which exhaust the free-tier connection pool.
export async function generateStaticParams() {
  return [];
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [product, user] = await Promise.all([
    prisma.product.findUnique({
      where: { slug, active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        category: true,
        imageUrl: true,
        description: true,
        instagramUrl: true,
      },
    }),
    getCurrentUser().catch(() => null),
  ]);

  if (!product) notFound();

  trackEvent({
    userId: user?.id,
    productId: product.id,
    eventType: "PRODUCT_VIEW",
    metadata: {
      productName: product.name,
      category: product.category,
      price: product.price,
    },
  }).catch(() => {});

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-rose-100 bg-white">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={500}
                height={600}
                className="aspect-square w-full object-cover"
                priority
              />
            ) : (
              <div className="flex aspect-square items-center justify-center bg-rose-50 text-8xl">
                🌸
              </div>
            )}
          </div>

          <div>
            <p className="text-sm uppercase tracking-wide text-rose-600">
              {product.category}
            </p>
            <h1 className="mt-2 font-serif text-3xl text-stone-900">
              {product.name}
            </h1>
            <p className="mt-4 text-2xl font-medium">
              {formatPrice(product.price)}
            </p>
            <p className="mt-6 text-stone-600 leading-relaxed">
              {product.description}
            </p>
            {product.instagramUrl && (
              <a
                href={product.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-600 hover:underline"
              >
                Watch Video on Instagram
              </a>
            )}
            <Link
              href={`/order/${product.slug}`}
              className="mt-8 inline-flex rounded-full bg-rose-700 px-8 py-3 text-sm font-medium text-white hover:bg-rose-800 transition"
              prefetch
            >
              Order this bouquet
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}