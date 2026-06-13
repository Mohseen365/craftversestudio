import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PaymentUpload } from "./PaymentUpload";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { trackEvent } from "@/lib/eventLogger";

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; orderNumber?: string }>;
}) {
  const params = await searchParams;
  const orderId = params.orderId ?? "";
  const orderNumber = params.orderNumber ?? "";
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }
  void trackEvent({
    userId: user.id,
    eventType: "PAYMENT_Page",
    metadata: {
      orderId: orderId,
      totalAmount: orderNumber,
    },
  });

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
          {orderId && orderNumber ? (
            <PaymentUpload orderId={orderId} orderNumber={orderNumber} />
          ) : (
            <p className="text-stone-500">
              Invalid order. Please start again from the catalog.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
