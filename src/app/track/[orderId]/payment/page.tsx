import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PaymentUpload } from "./PaymentUpload";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOrderForPayment } from "@/server/data/orders";

export const dynamic = "force-dynamic";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{
    orderId?: string;
  }>;
}) {
  const { orderId } = await params;

  if (!orderId) {
    redirect("/catalog");
  }

  const session = await auth();

  const userId = session?.user?.id;
  if (!userId) {
    redirect(`/auth-required?to=${encodeURIComponent(`/track/${orderId}`)}`);
  }
  const order = await getOrderForPayment(orderId, userId);

  if (!order) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-serif text-3xl text-stone-900">
          Upload payment proof
        </h1>
        <p className="mt-2 text-stone-500">
          We&apos;ll verify and confirm your order shortly
        </p>
        <div className="mt-8">
          <PaymentUpload
            orderId={order.id}
            orderNumber={order.orderNumber}
            total={order.total}
            // mobileNo={order.user.mobileNo ?? ""}
            userId={userId}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
