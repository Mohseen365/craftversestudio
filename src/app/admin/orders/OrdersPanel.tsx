"use client";

import { useState } from "react";
import { OrderCard } from "./OrderCard";
import { loadOrdersAction } from "./actions";
import type { SerializedOrder } from "./actions";

type Order = SerializedOrder;

const TABS = [
  { key: "PENDING_REVIEW", label: "Review Orders to Accept" },
  { key: "ACCEPTED", label: "ACCEPTED Orders" },
  { key: "REJECTED", label: "REJECTED Orders" },
  { key: "PAYMENT_PENDING", label: "PAYMENT IS PENDING" },
  { key: "PAYMENT_SUBMITTED", label: "PAYMENT SUBMITTED" },
  { key: "PAYMENT_VERIFICATION", label: "Pending Verification" },
  { key: "PAYMENT_REJECTED", label: "PAYMENT REJECTED" },
  { key: "REFUNDED", label: "REFUNDED" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "IN_PRODUCTION", label: "Production" },
  { key: "READY_TO_SHIP", label: "Ready to Ship" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "WAITLISTED", label: "WAITLISTED" },
  { key: "CANCELLED", label: "CANCELLED" },
];

interface OrdersPanelProps {
  initialOrders: Order[];
  initialTab: string;
}

export function OrdersPanel({ initialOrders, initialTab }: OrdersPanelProps) {
  const [tab, setTab] = useState(initialTab);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(false);

  async function loadOrders(status: string) {
    try {
      setLoading(true);
      const data = await loadOrdersAction(status);
      setOrders(data);
    } catch (error: unknown) {
      console.error(
        error instanceof Error ? error.message : "Failed to load orders",
      );
    } finally {
      setLoading(false);
    }
  }

  const handleOrderUpdate = (id: string, removed = false) => {
    if (removed) {
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } else {
      loadOrders(tab);
    }
  };

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={async () => {
              if (t.key === tab) return;
              setTab(t.key);
              await loadOrders(t.key);
            }}
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

      {/* Content */}
      {loading ? (
        <p className="mt-8 text-stone-500">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="mt-8 text-stone-500">No orders in this queue.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              tab={tab}
              onUpdate={handleOrderUpdate}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
