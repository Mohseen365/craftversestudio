"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

type PlanningOrder = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  occasionDate: string | null;
  address: string;
  bouquetQuantity: number;
  shippingDurationDays: number | null;
  shippingDate: string | null;
  productionDeadline: string | null;
  status: string;
};

type CapacityRow = {
  date: string;
  dailyCapacity: number;
  used: number;
  remaining: number;
  isFull: boolean;
  orders: PlanningOrder[];
};

export function CapacityPanel() {
  const [rows, setRows] = useState<CapacityRow[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/capacity");
    const data = await res.json();
    setRows(data.capacities ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-stone-100 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Production Date</th>
              <th className="px-4 py-3 font-medium">Used Capacity</th>
              <th className="px-4 py-3 font-medium">Available Capacity</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Orders</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.date} className="border-b border-stone-50">
                <td className="px-4 py-3 font-medium">{formatDate(row.date)}</td>
                <td className="px-4 py-3">
                  {row.used} / {row.dailyCapacity}
                </td>
                <td className="px-4 py-3">
                  <span className={row.remaining === 0 ? "text-red-600" : "text-emerald-600"}>
                    {row.remaining}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      row.isFull
                        ? "bg-red-50 text-red-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {row.isFull ? "Fully booked" : "Available"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() =>
                      setExpandedDate(expandedDate === row.date ? null : row.date)
                    }
                    className="rounded border border-stone-200 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                  >
                    {expandedDate === row.date ? "Hide" : "View"} {row.orders.length}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-6 text-sm text-stone-500">
            No accepted future orders have assigned production deadlines yet.
          </p>
        )}
      </div>

      {rows
        .filter((row) => row.date === expandedDate)
        .map((row) => (
          <section key={row.date} className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">
                  {formatDate(row.date)}
                </h2>
                <p className="text-sm text-stone-500">
                  Capacity Used: {row.used} / {row.dailyCapacity}
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-stone-100 text-stone-500">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Order ID</th>
                    <th className="py-2 pr-4 font-medium">Customer</th>
                    <th className="py-2 pr-4 font-medium">Occasion Date</th>
                    <th className="py-2 pr-4 font-medium">Address</th>
                    <th className="py-2 pr-4 font-medium">Bouquet Qty</th>
                    <th className="py-2 pr-4 font-medium">Ship Days</th>
                    <th className="py-2 pr-4 font-medium">Shipping Date</th>
                    <th className="py-2 pr-4 font-medium">Production Deadline</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {row.orders.map((order) => (
                    <tr key={order.id} className="border-b border-stone-50">
                      <td className="py-3 pr-4 font-mono text-xs">{order.orderNumber}</td>
                      <td className="py-3 pr-4">{order.customerName ?? "Guest"}</td>
                      <td className="py-3 pr-4">
                        {order.occasionDate ? formatDate(order.occasionDate) : "Not set"}
                      </td>
                      <td className="max-w-[260px] py-3 pr-4 text-stone-600">
                        {order.address || "Not set"}
                      </td>
                      <td className="py-3 pr-4">{order.bouquetQuantity}</td>
                      <td className="py-3 pr-4">
                        {order.shippingDurationDays ?? "Not set"}
                      </td>
                      <td className="py-3 pr-4">
                        {order.shippingDate ? formatDate(order.shippingDate) : "Not set"}
                      </td>
                      <td className="py-3 pr-4">
                        {order.productionDeadline
                          ? formatDate(order.productionDeadline)
                          : "Not set"}
                      </td>
                      <td className="py-3 pr-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
    </div>
  );
}
