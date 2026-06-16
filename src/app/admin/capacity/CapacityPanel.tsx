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
  // Pagination state: windowEnd defines the latest date displayed (inclusive)
  const [windowEnd, setWindowEnd] = useState<string>("");
  // Track the maximum date available from the data
  const [maxDate, setMaxDate] = useState<string>("");

  // Helper to add days to a date string (YYYY-MM-DD)
  function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  }

  async function load() {
    const res = await fetch("/api/admin/capacity");
    const data = await res.json();
    const fetchedRows: CapacityRow[] = data.capacities ?? [];
    // Determine the farthest production deadline
    const farthest = fetchedRows.reduce(
      (max, row) => (new Date(row.date) > new Date(max) ? row.date : max),
      fetchedRows[0]?.date ?? ""
    );
    setMaxDate(farthest);
    // Initialize pagination window: start with today + 7 days or farthest if smaller
    const today = new Date().toISOString().split("T")[0];
    const initialEnd = addDays(today, 7);
    setWindowEnd((prev) =>
      prev ? prev : initialEnd > farthest ? farthest : initialEnd
    );
    setRows(fetchedRows);
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
            {rows
              .filter((row) => new Date(row.date) <= new Date(windowEnd))
              .map((row) => (
                <tr key={row.date} className="border-b border-stone-50">
                  <td className="px-4 py-3 font-medium">
                    {formatDate(row.date)}
                  </td>
                  <td className="px-4 py-3">
                    {Number(row.used.toFixed(2))} /{" "}
                    {Number(row.dailyCapacity.toFixed(2))}
                    {/* Capacity Override UI */}
                    {expandedDate === row.date && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={row.dailyCapacity}
                          className="w-24 rounded border px-2 py-1 text-sm"
                          id={`capacity-input-${row.date}`}
                        />
                        <button
                          className="rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700"
                          onClick={async () => {
                            const input = document.getElementById(
                              `capacity-input-${row.date}`
                            ) as HTMLInputElement;
                            const newCap = parseFloat(input.value);
                            if (isNaN(newCap) || newCap < 0) return;
                            const resOver = await fetch(
                              "/api/admin/capacity/override",
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  date: row.date,
                                  maximumCapacity: newCap,
                                }),
                              }
                            );
                            if (!resOver.ok) {
                              const err = await resOver.text();
                              console.error(err);
                              return;
                            }
                            // Refresh data
                            await load();
                          }}
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        row.remaining <= 0 ? "text-red-600" : "text-emerald-600"
                      }
                    >
                      {Number(row.remaining.toFixed(2))}
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
                        setExpandedDate(
                          expandedDate === row.date ? null : row.date
                        )
                      }
                      className="rounded border border-stone-200 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                    >
                      {expandedDate === row.date ? "Hide" : "View"}{" "}
                      {row.orders.length}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
          {rows.length > 0 &&
            new Date(windowEnd).getTime() < new Date(maxDate).getTime() && (
              <tfoot>
                <tr>
                  <td colSpan={6} className="p-4 text-center">
                    <button
                      className="rounded bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700"
                      onClick={() => setWindowEnd(addDays(windowEnd, 7))}
                    >
                      Load more (7 days)
                    </button>
                  </td>
                </tr>
              </tfoot>
            )}
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
          <section
            key={row.date}
            className="rounded-lg border border-stone-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">
                  {formatDate(row.date)}
                </h2>
                <p className="text-sm text-stone-500">
                  Capacity Used: {Number(row.used.toFixed(2))} /{" "}
                  {Number(row.dailyCapacity.toFixed(2))}
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
                    <th className="py-2 pr-4 font-medium">Allocated Effort</th>
                    <th className="py-2 pr-4 font-medium">Ship Days</th>
                    <th className="py-2 pr-4 font-medium">Shipping Date</th>
                    <th className="py-2 pr-4 font-medium">
                      Production Deadline
                    </th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">
                      How much work today
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {row.orders.map((order) => (
                    <tr key={order.id} className="border-b border-stone-50">
                      <td className="py-3 pr-4 font-mono text-xs">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 pr-4">
                        {order.customerName ?? "Guest"}
                      </td>
                      <td className="py-3 pr-4">
                        {order.occasionDate
                          ? formatDate(order.occasionDate)
                          : "Not set"}
                      </td>
                      <td className="max-w-[260px] py-3 pr-4 text-stone-600">
                        {order.address || "Not set"}
                      </td>
                      <td className="py-3 pr-4">
                        {Number(order.bouquetQuantity.toFixed(2))} day(s)
                      </td>
                      <td className="py-3 pr-4">
                        {order.shippingDurationDays ?? "Not set"}
                      </td>
                      <td className="py-3 pr-4">
                        {order.shippingDate
                          ? formatDate(order.shippingDate)
                          : "Not set"}
                      </td>
                      <td className="py-3 pr-4">
                        {order.productionDeadline
                          ? formatDate(order.productionDeadline)
                          : "Not set"}
                      </td>
                      <td className="py-3 pr-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      {/* Inline Production Progress Input */}
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Completed"
                            className="w-20 rounded border px-2 py-1 text-sm"
                            id={`progress-input-${order.id}`}
                          />
                          <button
                            className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
                            onClick={async () => {
                              const input = document.getElementById(
                                `progress-input-${order.id}`
                              ) as HTMLInputElement;
                              const completed = parseFloat(input.value);
                              if (isNaN(completed)) return;

                              const resProg = await fetch(
                                "/api/admin/capacity/progress",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    orderId: order.id,
                                    date: row.date,
                                    completedUnits: completed,
                                  }),
                                }
                              );
                              if (!resProg.ok) {
                                const err = await resProg.text();
                                console.error(err);
                                return;
                              }
                              // Refresh rows to reflect updated remaining capacity
                              await load();
                            }}
                          >
                            Update
                          </button>
                        </div>
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
