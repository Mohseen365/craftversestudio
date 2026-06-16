"use client";

import { useState, useTransition } from "react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

type OrderResult = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  productionDeadline: string | null;
  shippingDate: string | null;
  deliveryDate: string | null;
  occasionDate: string | null;
  trackingNumber: string | null;
  total: number;
  items: Array<{ product: { name: string }; quantity: number }>;
  user: {
    mobileNo: string;
    id: string;
  };
};

type TrackFormProps = {
  contact: {
    mobileNo: string;
    orderNumber: string;
  };
};

export function TrackForm({ contact }: TrackFormProps) {
  const [orderNumber, setOrderNumber] = useState(contact.orderNumber ?? "");
  const [mobileNo, setMobileNo] = useState(contact.mobileNo ?? "");
  const [result, setResult] = useState<OrderResult | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    const params = new URLSearchParams();
    if (orderNumber.trim()) params.set("orderNumber", orderNumber.trim());
    if (mobileNo.trim()) params.set("mobileNo", mobileNo.trim());

    startTransition(async () => {
      try {
        const res = await fetch(`/api/orders/track?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Order not found");
        setResult(data.order);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Order not found");
      }
    });
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700">
            Order number
          </label>
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="BQ-XXXX"
            className="mt-1 w-full rounded-xl border border-stone-200 px-4 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">
            Mobile number
          </label>
          <input
            value={mobileNo}
            onChange={(e) => setMobileNo(e.target.value)}
            type="tel"
            className="mt-1 w-full rounded-xl border border-stone-200 px-4 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending || (!orderNumber.trim() && !mobileNo.trim())}
          className="rounded-full bg-rose-700 px-6 py-2 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-50 transition"
        >
          {isPending ? "Searching..." : "Track order"}
        </button>
      </form>

      {result && (
        <div className="mt-8 rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-stone-500">Order</p>
              <p className="font-mono text-lg font-medium">
                {result.orderNumber}
              </p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Payment Status</p>
              <p className="font-mono text-lg font-medium">
                {result.paymentStatus}
              </p>
            </div>
            <OrderStatusBadge status={result.status} />
          </div>

          {(result.status === "ACCEPTED" || result.status === "PAYMENT_PENDING") && (
            <Link
              href={`/order/${result.id}/payment?orderId=${
                result.id
              }&orderNumber=${result.orderNumber}&mobileNo=${
                result.user.mobileNo ?? mobileNo
              }&userId=${result.user.id}`}
              className="mt-4 inline-block rounded-full bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800 transition"
            >
              Proceed to Payment
            </Link>
          )}
          {result.status === "REJECTED" && (
            <p className="mt-4 text-sm text-red-600">
              Sorry, we cannot accept your order for that date. We are at full capacity.
            </p>
          )}
          {result.status === "PAYMENT_SUBMITTED" && (
            <p className="mt-4 text-sm text-blue-600">We will verify your payment shortly.</p>
          )}
          {result.status === "PAYMENT_VERIFICATION" && (
            <p className="mt-4 text-sm text-amber-600">Payment is under verification.</p>
          )}
          {result.status === "PAYMENT_REJECTED" && (
            <p className="mt-4 text-sm text-red-600">Payment rejected. We will contact you.</p>
          )}

          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-stone-500">Order date</dt>
              <dd className="font-medium">{formatDate(result.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Delivery date</dt>
              <dd className="font-medium">
                {result.deliveryDate
                  ? formatDate(result.deliveryDate)
                  : "Not set"}
              </dd>
            </div>
            {result.trackingNumber && (
              <div>
                <dt className="text-stone-500">Tracking number</dt>
                <dd className="font-medium">{result.trackingNumber}</dd>
              </div>
            )}
          </dl>
          <ul className="mt-4 border-t border-stone-100 pt-4 text-sm">
            {result.items.map((item, i) => (
              <li key={i} className="text-stone-600">
                {item.product.name} × {item.quantity}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}