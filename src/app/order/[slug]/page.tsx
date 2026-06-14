export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { prisma } from "@/lib/prisma";
import { getAvailableDates } from "@/lib/capacity";
import { OrderForm } from "./OrderForm";
import { redirect } from "next/navigation";
// import { getCurrentUser } from "@/lib/auth";
import { getOrCreateCustomer } from "@/lib/auth";
import { trackEvent } from "@/lib/eventLogger";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // const user = await getCurrentUser();

  // if (!user) {
  //   redirect("/login");
  // }

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id, active: true },
  });

  if (!product) notFound();

  const user = await getOrCreateCustomer();

  void trackEvent({
    userId: user.id,
    eventType: "ORDER_Page",
    metadata: {
      id: id,
      productName: product.name,
      category: product.category,
      price: product.price,
    },
  });
  // const dates = await getAvailableDates(45);
  // const availableDates = dates.map((d) => ({
  //   date: d.date.toISOString(),
  //   remaining: d.remaining,
  //   available: d.available,
  // }));

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
            // availableDates={availableDates}
            userId={user.id}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
