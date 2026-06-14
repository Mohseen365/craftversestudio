"use client";

import { useState } from "react";
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
  shippingDeadline: string | null;
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
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const params = new URLSearchParams();
    if (orderNumber.trim()) params.set("orderNumber", orderNumber.trim());
    if (mobileNo.trim()) params.set("mobileNo", mobileNo.trim());

    try {
      //add payment status in data from res
      const res = await fetch(`/api/orders/track?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Order not found");
      setResult(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order not found");
    } finally {
      setLoading(false);
    }
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
          disabled={loading || (!orderNumber.trim() && !mobileNo.trim())}
          className="rounded-full bg-rose-700 px-6 py-2 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Track order"}
        </button>
      </form>

      {result && (
        <div className="mt-8 rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
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
            {result.status === "ACCEPTED" && (
              <Link
                href={`/order/${result.id}/payment?orderId=${result.id}&orderNumber=${result.orderNumber}&mobileNo=${result.user.mobileNo ?? mobileNo}&userId=${result.user.id}`}
              >
                Proceed to Payment
              </Link>
            )}
            {result.status === "REJECTED" && (
              // <Link
              //   href={`/order/payment?orderId=${result.id}&orderNumber=${result.orderNumber}`}
              // >
              <p>Sorry we cant accept your order at that date we are full</p>
              // </Link>
            )}
            {result.status === "PAYMENT_PENDING" && (
              <Link
                href={`/order/${result.id}/payment?orderId=${result.id}&orderNumber=${result.orderNumber}&mobileNo=${result.user.mobileNo ?? mobileNo}&userId=${result.user.id}`}
              >
                Proceed to Payment
              </Link>
            )}
            {result.status === "PAYMENT_SUBMITTED" && (
              <p>We will verify your payment</p>
            )}
            {result.status === "PAYMENT_VERIFICATION" && (
              <p>Payment is under Verification</p>
            )}
            {result.status === "PAYMENT_REJECTED" && (
              <p>Payment is REJECTED. We will contact you</p>
            )}
            <OrderStatusBadge status={result.status} />
          </div>
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-stone-500">Order date</dt>
              <dd className="font-medium">{formatDate(result.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Delivery date</dt>
              <dd className="font-medium">
                {result.deliveryDate ? formatDate(result.deliveryDate) : "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Production deadline</dt>
              <dd className="font-medium">
                {result.productionDeadline
                  ? formatDate(result.productionDeadline)
                  : "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Shipping deadline</dt>
              <dd className="font-medium">
                {result.shippingDeadline
                  ? formatDate(result.shippingDeadline)
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
