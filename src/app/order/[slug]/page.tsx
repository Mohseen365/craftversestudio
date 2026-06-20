import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import { OrderForm } from "./OrderForm";
import { getOrCreateCustomerId } from "@/lib/auth";
import { trackEvent } from "@/lib/eventLogger";

export const dynamic = "force-dynamic";

// Return no static params — generated on first request and cached.
export async function generateStaticParams() {
  return [];
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug, active: true },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      category: true,
    },
  });

  if (!product) notFound();
  const userId = await getOrCreateCustomerId();

  trackEvent({
    userId: userId,
    eventType: "ORDER_PAGE_VIEWED",
    metadata: {
      productName: product.name,
      category: product.category,
      price: product.price,
    },
  }).catch(() => {});

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-serif text-3xl text-stone-900">
          Order {product.name}
        </h1>
        <p className="mt-2 text-stone-500">
          Fill in your details and pick a delivery date
        </p>
        <div className="mt-8">
          <OrderForm
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: product.price,
            }}
            userId={userId ?? ""}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
