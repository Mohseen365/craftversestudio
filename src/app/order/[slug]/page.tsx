import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getProductBySlug } from "@/server/data/products";
import { OrderForm } from "./OrderForm";
import { auth } from "@/auth";
import { setRedirectDestination } from "@/lib/redirect-cookie";

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
  if (!slug) {
    console.log("no slug found");
  }
  const session = await auth();

  const userId = session?.user?.id;
  if (!userId) {
    await setRedirectDestination(`/order/${slug}`);
    redirect("/login");
    // redirect(`/login?slug=${slug}`);
  }

  const product = await getProductBySlug(slug);
  if (!product || !product.active) {
    console.log("no active product found with slug");
    notFound();
  }

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
              productionHours: product.productionHours.toNumber(),
            }}
            userId={userId}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
