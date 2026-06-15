"use client";

import { useEffect, useState } from "react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { addDays, formatDate, formatPrice } from "@/lib/utils";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  occasionDate: string | null;
  deliveryDate: string | null;
  productionDeadline: string | null;
  shippingDate: string | null;
  shippingDurationDays: number | null;
  total: number;
  trackingNumber: string | null;
  quantity: number;
  user: {
    name: string;
    mobileNo: string;
    email: string | null;
    addresses: Array<{
      address: string;
      city: string;
      state: string;
      pincode: string;
    }>;
  };
  items: Array<{ product: { name: string }; quantity: number }>;
  payments: Array<{ screenshotUrl: string | null; status: string }>;
};

type CapacityPreview = {
  canAccept: boolean;
  reason?: string;
  suggestedDates: Array<{ date: string; quantity: number }>;
  requiredCapacity: number;
  productionDeadline: string;
};

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
  const [shippingDurations, setShippingDurations] = useState<
    Record<string, number>
  >({});
  const [capacityPreviews, setCapacityPreviews] = useState<
    Record<string, CapacityPreview>
  >({});

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

  function getPlanningDates(order: Order) {
    const duration = shippingDurations[order.id];
    if (
      !order.occasionDate ||
      duration === undefined ||
      Number.isNaN(duration)
    ) {
      return { shippingDate: null, productionDeadline: null };
    }

    const shippingDate = addDays(order.occasionDate, -duration);
    return {
      shippingDate,
      productionDeadline: addDays(shippingDate, -1),
    };
  }

  async function loadCapacityPreview(order: Order, duration: number) {
    if (!order.occasionDate || Number.isNaN(duration)) return;

    const shippingDate = addDays(order.occasionDate, -duration);
    const productionDeadline = addDays(shippingDate, -1);
    const params = new URLSearchParams({
      productionDeadline: productionDeadline.toISOString(),
      quantity: String(order.quantity),
      orderId: order.id,
    });
    const res = await fetch(`/api/admin/capacity?${params.toString()}`);
    const data = await res.json();
    if (data.capacity) {
      setCapacityPreviews((current) => ({
        ...current,
        [order.id]: data.capacity,
      }));
    }
  }

  async function acceptOrder(order: Order) {
    const shippingDurationDays = shippingDurations[order.id];
    if (
      shippingDurationDays === undefined ||
      Number.isNaN(shippingDurationDays)
    ) {
      alert("Enter shipping duration before accepting this order");
      return;
    }

    const res = await fetch(`/api/orders/${order.id}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shippingDurationDays }),
    });

    if (res.ok) {
      loadOrders(tab);
      return;
    }

    const data = await res.json();
    alert(data.error ?? "Could not accept order");
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
                  <p className="font-mono font-medium">
                    orderNumber: {order.orderNumber}
                  </p>
                  <p className="text-sm text-stone-600">
                    Name: {order.user.name}, Mobile No: {order.user.mobileNo}
                  </p>
                  <p className="text-sm text-stone-500">
                    Delivery:{" "}
                    {order.occasionDate
                      ? formatDate(order.occasionDate)
                      : "Not set"}{" "}
                    · {formatPrice(order.total)}
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
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead className="border-b border-stone-100 text-stone-500">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Order ID</th>
                      <th className="py-2 pr-4 font-medium">
                        Production deadline
                      </th>
                      <th className="py-2 pr-4 font-medium">Shipping date</th>
                      <th className="py-2 pr-4 font-medium">Reach customer</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-stone-50">
                      <td className="py-3 pr-4 font-mono text-xs">
                        {order.id}
                      </td>
                      <td className="py-3 pr-4">
                        {order.productionDeadline
                          ? formatDate(order.productionDeadline)
                          : "Not set"}
                      </td>
                      <td className="py-3 pr-4">
                        {order.shippingDate
                          ? formatDate(order.shippingDate)
                          : "Not set"}
                      </td>
                      <td className="py-3 pr-4">
                        {order.occasionDate
                          ? formatDate(order.occasionDate)
                          : "Not set"}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead className="border-b border-stone-100 text-stone-500">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Address</th>
                      <th className="py-2 pr-4 font-medium">City</th>
                      <th className="py-2 pr-4 font-medium">State</th>
                      <th className="py-2 pr-4 font-medium">Pincode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.user.addresses.map((addr, index) => (
                      <tr key={index} className="border-b border-stone-50">
                        <td className="py-3 pr-4 font-mono text-xs">
                          {addr.address}
                        </td>
                        <td className="py-3 pr-4">{addr.city}</td>
                        <td className="py-3 pr-4">{addr.state}</td>
                        <td className="py-3 pr-4">{addr.pincode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {order.status === "PENDING_REVIEW" && (
                <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <label className="text-sm">
                      <span className="block font-medium text-stone-700">
                        Shipping duration
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={shippingDurations[order.id] ?? ""}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setShippingDurations((current) => ({
                            ...current,
                            [order.id]: value,
                          }));
                          loadCapacityPreview(order, value);
                        }}
                        className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <div className="text-sm">
                      <span className="block font-medium text-stone-700">
                        Shipping date
                      </span>
                      <span className="mt-2 block text-stone-600">
                        {getPlanningDates(order).shippingDate
                          ? formatDate(getPlanningDates(order).shippingDate!)
                          : "Enter duration"}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="block font-medium text-stone-700">
                        Production deadline
                      </span>
                      <span className="mt-2 block text-stone-600">
                        {getPlanningDates(order).productionDeadline
                          ? formatDate(
                              getPlanningDates(order).productionDeadline!
                            )
                          : "Enter duration"}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="block font-medium text-stone-700">
                        Capacity
                      </span>
                      {capacityPreviews[order.id] ? (
                        <div>
                          <span
                            className={`mt-2 block font-medium ${
                              capacityPreviews[order.id].canAccept
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}
                          >
                            {capacityPreviews[order.id].canAccept ? "Available" : "No Capacity"}
                          </span>
                          <span className="mt-1 block text-xs text-stone-500">
                            Required capacity: {Number(capacityPreviews[order.id].requiredCapacity.toFixed(2))}
                          </span>
                        </div>
                      ) : (
                        <span className="mt-2 block text-stone-600">
                          Enter duration
                        </span>
                      )}
                    </div>
                  </div>
                  {capacityPreviews[order.id] && (
                    <div className="mt-3 text-sm">
                      {capacityPreviews[order.id].canAccept ? (
                        <div className="text-emerald-700">
                          <span className="font-semibold">Suggested schedule:</span>
                          <ul className="list-disc list-inside mt-1 text-xs">
                            {capacityPreviews[order.id].suggestedDates.map((d, i) => (
                              <li key={i}>
                                {formatDate(d.date)}: {Number(d.quantity.toFixed(2))} day(s)
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="font-medium text-red-700">
                          {capacityPreviews[order.id].reason ?? "Accepting this order exceeds available production capacity."}
                        </p>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => acceptOrder(order)}
                    disabled={capacityPreviews[order.id]?.canAccept === false}
                    className="mt-4 rounded bg-green-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-stone-300"
                  >
                    Accept Order
                  </button>
                </div>
              )}
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
