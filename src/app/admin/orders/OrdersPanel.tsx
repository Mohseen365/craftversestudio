"use client";

import { useEffect, useState } from "react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatDate, formatPrice } from "@/lib/utils";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  deliveryDate: string;
  total: number;
  trackingNumber: string | null;
  user: { name: string; mobileNo: string; email: string | null };
  items: Array<{ product: { name: string }; quantity: number }>;
  payments: Array<{ screenshotUrl: string | null; status: string }>;
};

const TABS = [
  { key: "PAYMENT_VERIFICATION", label: "Pending Verification" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "IN_PRODUCTION", label: "Production" },
  { key: "READY_TO_SHIP", label: "Ready to Ship" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
];

const NEXT_STATUS: Record<string, string> = {
  CONFIRMED: "IN_PRODUCTION",
  IN_PRODUCTION: "READY_TO_SHIP",
  READY_TO_SHIP: "SHIPPED",
  SHIPPED: "DELIVERED",
};

export function OrdersPanel() {
  const [tab, setTab] = useState("PAYMENT_VERIFICATION");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadOrders(status: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/orders?status=${status}`);
    const data = await res.json();
    setOrders(data.orders ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders(tab);
  }, [tab]);

  async function updateOrder(id: string, body: Record<string, unknown>) {
    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    loadOrders(tab);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t.key
                ? "bg-stone-900 text-white"
                : "bg-white text-stone-600 border border-stone-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-stone-500">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="mt-8 text-stone-500">No orders in this queue.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono font-medium">{order.orderNumber}</p>
                  <p className="text-sm text-stone-600">
                    {order.user.name} · {order.user.mobileNo}
                  </p>
                  <p className="text-sm text-stone-500">
                    Delivery: {formatDate(order.deliveryDate)} ·{" "}
                    {formatPrice(order.total)}
                  </p>
                  <ul className="mt-2 text-sm text-stone-600">
                    {order.items.map((item, i) => (
                      <li key={i}>
                        {item.product.name} × {item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              {order.payments[0]?.screenshotUrl &&
                tab === "PAYMENT_VERIFICATION" && (
                  <div className="mt-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={order.payments[0].screenshotUrl}
                      alt="Payment proof"
                      className="max-h-48 rounded-lg border"
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() =>
                          updateOrder(order.id, { verifyPayment: true })
                        }
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
                      >
                        Approve payment
                      </button>
                      <button
                        onClick={() =>
                          updateOrder(order.id, { rejectPayment: true })
                        }
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}

              {NEXT_STATUS[order.status] && (
                <button
                  onClick={() =>
                    updateOrder(order.id, { status: NEXT_STATUS[order.status] })
                  }
                  className="mt-4 rounded-lg bg-stone-900 px-4 py-2 text-sm text-white"
                >
                  Move to {NEXT_STATUS[order.status].replace(/_/g, " ")}
                </button>
              )}

              {order.status === "READY_TO_SHIP" && (
                <div className="mt-4 flex gap-2">
                  <input
                    placeholder="Tracking number"
                    className="rounded-lg border px-3 py-2 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = (e.target as HTMLInputElement).value;
                        updateOrder(order.id, {
                          status: "SHIPPED",
                          trackingNumber: val,
                        });
                      }
                    }}
                  />
                </div>
              )}

              {order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
                <button
                  onClick={() => updateOrder(order.id, { status: "CANCELLED" })}
                  className="mt-2 text-sm text-red-500 hover:underline"
                >
                  Cancel order
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
