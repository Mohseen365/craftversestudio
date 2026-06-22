import Link from "next/link";
// import { PaymentStatus } from "@prisma/client";
import { STATUS_MESSAGES } from "../config";
import { OrderStatus } from "@prisma/client";

type OrderResult = {
  id: string;
  // orderNumber: string;
  status: OrderStatus;
  // paymentStatus: PaymentStatus;
  // createdAt: string;
  // productionDeadline: string | null;
  // shippingDate: string | null;
  // deliveryDate: string | null;
  // occasionDate: string | null;
  // trackingNumber: string | null;
  // total: number;
  // items: Array<{
  //   product: { name: string; productionDays: number };
  //   quantity: number;
  // }>;
  // payments: Array<{ status: PaymentStatus; screenshotUrl: string | null }>;
  // user: {
  //   mobileNo: string | null;
  //   id: string;
  // };
};

export function OrderStatusCard({ order }: { order: OrderResult }) {
  const status = STATUS_MESSAGES[order.status];

  if (!status) return null;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="font-semibold">{status.title}</h2>

      <p className="mt-2 text-sm text-stone-600">{status.description}</p>

      {(order.status === "PAYMENT_PENDING" ||
        order.status === "PAYMENT_REJECTED") && (
        <Link
          href={`/track/${order.id}/payment`}
          className="mt-4 inline-flex rounded-full bg-rose-700 px-5 py-2 text-white"
        >
          Complete Payment
        </Link>
      )}
    </div>
  );
}
