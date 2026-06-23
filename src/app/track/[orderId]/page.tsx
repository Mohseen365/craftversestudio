export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import { auth } from "@/auth";
import { getOrderDetails } from "@/server/data/orders";

import { OrderDetails } from "./OrderDetails";
import { setRedirectDestination } from "@/lib/redirect-cookie";

export default async function OrderPage({
  params,
}: {
  params: Promise<{
    orderId: string;
  }>;
}) {
  const { orderId } = await params;

  const session = await auth();

  const userId = session?.user?.id;

  if (!userId) {
    await setRedirectDestination(`/track/${orderId}`);
    redirect("/login");
  }

  const order = await getOrderDetails(orderId, userId);

  if (!order) {
    notFound();
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-10">
        <OrderDetails order={order} />
      </main>

      <Footer />
    </>
  );
}
