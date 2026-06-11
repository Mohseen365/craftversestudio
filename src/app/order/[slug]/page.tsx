export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import { getAvailableDates } from "@/lib/capacity";
import { OrderForm } from "./OrderForm";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug, active: true },
  });

  if (!product) notFound();

  const dates = await getAvailableDates(45);
  const availableDates = dates.map((d) => ({
    date: d.date.toISOString(),
    remaining: d.remaining,
    available: d.available,
  }));

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-serif text-3xl text-stone-900">Order {product.name}</h1>
        <p className="mt-2 text-stone-500">Fill in your details and pick a delivery date</p>
        <div className="mt-8">
          <OrderForm
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: product.price,
            }}
            availableDates={availableDates}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
