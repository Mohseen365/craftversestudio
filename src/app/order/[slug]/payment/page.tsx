import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PaymentUpload } from "./PaymentUpload";
import { notFound, redirect } from "next/navigation";
import { trackEvent } from "@/lib/eventLogger";
import { prisma } from "@/lib/prisma";

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{
    orderId?: string;
    orderNumber?: string;
    mobileNo?: string;
    userId?: string;
  }>;
}) {
  const params = await searchParams;
  const orderId = params.orderId ?? "";
  const orderNumber = params.orderNumber ?? "";
  const mobileNo = params.mobileNo ?? "";
  const userId = params.userId ?? "";

  if (!orderId) {
    redirect("/catalog");
  }

  // Verify order on server
  const order = await prisma.order.findFirst({
    where: {
      AND: [
        { id: orderId },
        { orderNumber: orderNumber },
        {
          user: {
            OR: [{ mobileNo: mobileNo }, { id: userId }],
          },
        },
      ],
    },
    select: {
      id: true,
      orderNumber: true,
      user: {
        select: { mobileNo: true },
      },
    },
  });

  if (!order) {
    notFound();
  }

  if (!mobileNo) {
    redirect("/login");
  }
  void trackEvent({
    userId: userId,
    eventType: "PAYMENT_Page",
    metadata: {
      orderId: orderId,
      totalAmount: orderNumber,
      mobileNo: mobileNo,
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
            <PaymentUpload
              orderId={orderId}
              orderNumber={orderNumber}
              userId={userId}
              mobileNo={mobileNo}
            />
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
