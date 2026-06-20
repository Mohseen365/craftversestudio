export const dynamic = "force-dynamic";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TrackForm } from "./TrackForm";
import { trackEvent } from "@/lib/eventLogger";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// import { PaymentStatus } from "@prisma/client";
// type OrderResult = {
//   id: string;
//   orderNumber: string;
//   status: string;
//   paymentStatus: string;
//   createdAt: string;
//   // productionDeadline: string | null;
//   shippingDate: string | null;
//   deliveryDate: string | null;
//   occasionDate: string | null;
//   trackingNumber: string | null;
//   total: number;
//   items: Array<{
//     product: { name: string; productionDays: number };
//     quantity: number;
//   }>;
//   payments: Array<{ status: PaymentStatus; screenshotUrl: string | null }>;
//   user: {
//     mobileNo: string | null;
//     id: string;
//   };
// };
export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string; mobileNo?: string }>;
}) {
  const params = await searchParams;
  const orderNumber = params.orderNumber ?? "";
  const mobileNo = params.mobileNo ?? "";

  // let initialResult: OrderResult | null = null;
  let initialResult = null;
  if (orderNumber || mobileNo) {
    const order = await prisma.order.findFirst({
      where: orderNumber
        ? { orderNumber: orderNumber.toUpperCase() }
        : { user: { mobileNo: mobileNo! } },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        occasionDate: true,
        deliveryDate: true,
        createdAt: true,
        shippingDate: true,
        total: true,
        trackingNumber: true,
        payments: {
          select: { status: true, screenshotUrl: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        items: {
          select: {
            quantity: true,
            product: { select: { name: true, productionDays: true } },
          },
        },
        user: { select: { mobileNo: true, id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (order) {
      initialResult = {
        ...order,
        createdAt: order.createdAt.toISOString(),
        shippingDate: order.shippingDate?.toISOString() ?? null,
        occasionDate: order.occasionDate?.toISOString() ?? null,
        deliveryDate:
          (order.deliveryDate ?? order.occasionDate)?.toISOString() ?? null,
        paymentStatus: order.payments[0]?.status ?? "PENDING",

        items: order.items.map((i) => ({
          ...i,
          product: {
            ...i.product,
            productionDays: i.product.productionDays.toNumber(),
          },
        })),
      };
    }
    // const test: OrderResult | null = initialResult;
  }

  getCurrentUserId()
    .then((userId) => {
      if (userId) {
        trackEvent({ userId: userId, eventType: "TRACK_ORDER" });
      }
    })
    .catch((err) => console.error("Tracking event failed at track page", err));
  return (
    <>
      <Header />
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="font-serif text-3xl text-stone-900">Track your order</h1>
        <p className="mt-2 text-stone-500">
          Enter your order number or Mobile number to see status updates
        </p>
        <div className="mt-8">
          <TrackForm
            contact={{
              mobileNo: mobileNo,
              orderNumber: orderNumber,
            }}
            initialResult={initialResult}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
