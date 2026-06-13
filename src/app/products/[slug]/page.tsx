export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDate } from "@/lib/utils";
//import { getAvailableDates } from "@/lib/capacity";
import { trackEvent } from "@/lib/eventLogger";
// import { getCurrentUser } from "@/lib/auth";
import { getOrCreateCustomer } from "@/lib/auth";

// const user = await getCurrentUser();
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug, active: true },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });

  if (!product) notFound();

  void getOrCreateCustomer()
    .then((user) =>
      trackEvent({
        userId: user?.id,
        productId: product.id,
        eventType: "PRODUCT_VIEW",
        metadata: {
          productName: product.name,
          category: product.category,
          price: product.price,
        },
      })
    )
    .catch((err) => console.error("Customer creation failed:", err));

  //const availableDates = await getAvailableDates(45);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-rose-100 bg-white">
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.images[0].imageUrl}
                alt={product.name}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center bg-rose-50 text-8xl">
                🌸
              </div>
            )}
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2 p-4">
                {product.images.slice(1).map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.id}
                    src={img.imageUrl}
                    alt=""
                    className="aspect-square rounded-lg object-cover"
                  />
                ))}
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
            {/*             
            <p className="mt-4 text-sm text-stone-500">
              Production time: {product.productionDays} day(s) before delivery
            </p> 

            <div className="mt-8 rounded-2xl border border-rose-100 bg-rose-50/50 p-6">
              <h2 className="font-medium text-stone-900">Available delivery dates</h2>
              {availableDates.length === 0 ? (
                <p className="mt-2 text-sm text-stone-500">
                  No dates configured yet. Contact us on Instagram.
                </p>
              ) : (
                <ul className="mt-4 space-y-2 text-sm">
                  {availableDates.slice(0, 8).map((d) => (
                    <li key={d.date.toISOString()} className="flex justify-between">
                      <span>{formatDate(d.date)}</span>
                      <span className={d.available ? "text-emerald-600" : "text-red-500"}>
                        {d.available ? `${d.remaining} slots left` : "Full"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
                     */}
            <Link
              href={`/order/${product.slug}`}
              className="mt-8 inline-flex rounded-full bg-rose-700 px-8 py-3 text-sm font-medium text-white hover:bg-rose-800 transition"
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
