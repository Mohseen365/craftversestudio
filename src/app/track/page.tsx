export const dynamic = "force-dynamic";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TrackForm } from "./TrackForm";
import { getCurrentUserId } from "@/lib/auth";
import { getTrackableOrder } from "@/server/data/orders";
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
  const userId = await getCurrentUserId();
  const initialResult = orderNumber
    ? await getTrackableOrder({ orderNumber, mobileNo, userId })
    : null;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="font-serif text-3xl text-stone-900">Track your order</h1>
        <p className="mt-2 text-stone-500">
          Enter your order number and mobile number to see status updates
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
