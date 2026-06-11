"use client";

import { useState } from "react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatDate } from "@/lib/utils";

type OrderResult = {
  orderNumber: string;
  status: string;
  createdAt: string;
  deliveryDate: string;
  trackingNumber: string | null;
  total: number;
  items: Array<{ product: { name: string }; quantity: number }>;
};

export function TrackForm({ initialOrderNumber }: { initialOrderNumber?: string }) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber ?? "");
  const [phone, setPhone] = useState("");
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
    if (phone.trim()) params.set("phone", phone.trim());

    try {
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
          <label className="block text-sm font-medium text-stone-700">Order number</label>
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="BQ-XXXX"
            className="mt-1 w-full rounded-xl border border-stone-200 px-4 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Or phone number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            className="mt-1 w-full rounded-xl border border-stone-200 px-4 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || (!orderNumber.trim() && !phone.trim())}
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
              <p className="font-mono text-lg font-medium">{result.orderNumber}</p>
            </div>
            <OrderStatusBadge status={result.status} />
          </div>
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-stone-500">Order date</dt>
              <dd className="font-medium">{formatDate(result.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Delivery date</dt>
              <dd className="font-medium">{formatDate(result.deliveryDate)}</dd>
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
