import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getProductBySlug } from "@/server/data/products";
import { formatPrice } from "@/lib/utils";
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
  if (!slug) {
    console.log("no slug found");
  }
  const product = await getProductBySlug(slug);
  if (!product || !product.active) {
    console.log("no active product found with slug");
    notFound();
  }

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
