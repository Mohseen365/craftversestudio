export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import { auth } from "@/auth";
import { getUserOrders } from "@/server/data/orders";

import { OrdersList } from "./OrdersList";

export default async function TrackPage() {
  const session = await auth();

  const userId = session?.user?.id;

  if (!userId) {
    redirect(`/auth-required?to=${encodeURIComponent(`/track`)}`);
  }

  const orders = await getUserOrders(userId);

  return (
    <>
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-serif text-3xl text-stone-900">My Orders</h1>

        <p className="mt-2 text-stone-500">
          View your current and past bouquet orders.
        </p>

        <OrdersList orders={orders} />
      </main>

      <Footer />
    </>
  );
}
