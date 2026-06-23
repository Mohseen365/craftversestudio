"use client";

import { useMemo, useState, useRef } from "react";
import { formatDate } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

type OrderItem = {
  productName: string;
  quantity: number;
  productionHours: number; // CHANGED
};

type PlanningOrder = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  occasionDate: string | null;
  allocatedToday: number; // Hours allocated to this date
  totalRequiredEffort: number; // Total hours needed
  completedEffort: number; // Hours completed
  remainingEffort: number; // Hours remaining
  shippingDurationDays: number | null;
  shippingDate: string | null;
  productionDeadline: string | null;
  status: string;
  items: OrderItem[];
};

type CapacityRow = {
  date: string;
  dailyCapacity: number;
  used: number;
  remaining: number;
  isFull: boolean;
  orders: PlanningOrder[];
};

export function CapacityPanel({ initialData }: { initialData: CapacityRow[] }) {
  const [rows, setRows] = useState<CapacityRow[]>(initialData);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  // Track per-reservation optimistic completedEffort updates
  const [progressOverrides, setProgressOverrides] = useState<
    Record<string, number>
  >({});
  const capacityRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const progressRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  }

  const maxDate = useMemo(() => {
    return rows.reduce(
      (max, row) => (new Date(row.date) > new Date(max) ? row.date : max),
      rows[0]?.date ?? "",
    );
  }, [rows]);

  const [windowEnd, setWindowEnd] = useState<string>(() => {
    const today = new Date().toISOString().split("T")[0];
    const initialEnd = addDays(today, 7);
    return initialEnd > maxDate ? maxDate : initialEnd;
  });

  async function load() {
    try {
      const res = await fetch("/api/admin/capacity");

      if (!res.ok) {
        throw new Error("Failed to load capacity");
      }

      const data = await res.json();

      const fetchedRows: CapacityRow[] = data.capacities ?? [];
      setRows(fetchedRows);
      setProgressOverrides({});
    } catch (error) {
      console.error(error);
      alert("Failed to refresh capacity data");
    }
  }

  return (
    <div className="space-y-6">
      {/* Table 1 — Daily capacity overview */}
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-stone-100 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Production Date</th>
              <th className="px-4 py-3 font-medium">Used / Daily Capacity</th>
              <th className="px-4 py-3 font-medium">Available</th>
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
                    <div>
                      {Number(row.used.toFixed(1))}h /{" "}
                      {Number(row.dailyCapacity.toFixed(1))}h
                    </div>
                    {expandedDate === row.date && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          defaultValue={row.dailyCapacity}
                          className="w-24 rounded border px-2 py-1 text-sm"
                          ref={(el) => {
                            capacityRefs.current[row.date] = el;
                          }}
                          disabled={isUpdating}
                        />
                        <span className="text-xs text-stone-500">hours</span>
                        <button
                          className="rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700 disabled:bg-indigo-400"
                          disabled={isUpdating}
                          onClick={async () => {
                            const input = capacityRefs.current[row.date];
                            if (!input) return;

                            const newCap = parseFloat(input.value);
                            if (isNaN(newCap) || newCap < 0) return;
                            setIsUpdating(true);
                            try {
                              const res = await fetch(
                                "/api/admin/capacity/override",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    date: row.date,
                                    maximumHours: newCap,
                                  }),
                                },
                              );
                              if (!res.ok) {
                                const err = await res.text();
                                console.error(err);
                                return;
                              }
                              await load();
                            } finally {
                              setIsUpdating(false);
                            }
                          }}
                        >
                          {isUpdating ? "Saving..." : "Save"}
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
                      {Number(row.remaining.toFixed(1))}h
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
                          expandedDate === row.date ? null : row.date,
                        )
                      }
                      className="rounded border border-stone-200 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                      disabled={isUpdating}
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
                  <td colSpan={5} className="p-4 text-center">
                    <button
                      className="rounded bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700 disabled:bg-sky-400"
                      disabled={isUpdating}
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

      {/* Table 2 — Expanded order detail for the selected date */}
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
                  Capacity used: {Number(row.used.toFixed(1))} /{" "}
                  {Number(row.dailyCapacity.toFixed(1))}
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-b border-stone-100 text-stone-500">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Order</th>
                    <th className="py-2 pr-4 font-medium">Customer</th>
                    <th className="py-2 pr-4 font-medium">Items</th>
                    <th className="py-2 pr-4 font-medium">Total Effort</th>
                    <th className="py-2 pr-4 font-medium">Allocated Today</th>
                    <th className="py-2 pr-4 font-medium">Completed</th>
                    <th className="py-2 pr-4 font-medium">Remaining</th>
                    <th className="py-2 pr-4 font-medium">Deadline</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Mark Work Done</th>
                  </tr>
                </thead>
                <tbody>
                  {row.orders.map((order) => {
                    // Apply any optimistic update from this session
                    const overrideKey = `${order.id}`;
                    const displayCompleted =
                      progressOverrides[overrideKey] ?? order.completedEffort;
                    const displayRemaining = Math.max(
                      0,
                      order.totalRequiredEffort - displayCompleted,
                    );

                    return (
                      <tr key={order.id} className="border-b border-stone-50">
                        <td className="py-3 pr-4 font-mono text-xs">
                          {order.orderNumber}
                        </td>
                        <td className="py-3 pr-4">
                          {order.customerName ?? "Guest"}
                        </td>
                        <td className="py-3 pr-4 text-xs text-stone-500">
                          {order.items.map((item, i) => (
                            <div key={i}>
                              {item.productName} ×{item.quantity} (
                              {item.productionHours}h each)
                            </div>
                          ))}
                        </td>
                        {/* Total required effort = Σ(productionDays × qty) */}
                        <td className="py-3 pr-4 font-medium">
                          {Number(order.totalRequiredEffort.toFixed(1))}h
                        </td>
                        {/* Effort slice allocated specifically on this date */}
                        <td className="py-3 pr-4">
                          {Number(order.allocatedToday.toFixed(1))}h
                        </td>
                        {/* Completed = sum of completedQuantity across all reservations */}
                        <td className="py-3 pr-4 text-emerald-700">
                          {Number(displayCompleted.toFixed(1))}h
                        </td>
                        {/* Remaining = totalRequired - completed */}
                        <td
                          className={`py-3 pr-4 font-medium ${
                            displayRemaining <= 0
                              ? "text-stone-400"
                              : "text-amber-700"
                          }`}
                        >
                          {Number(displayRemaining.toFixed(2))} day(s)
                        </td>
                        <td className="py-3 pr-4">
                          {order.productionDeadline
                            ? formatDate(order.productionDeadline)
                            : "Not set"}
                        </td>
                        <td className="py-3 pr-4">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0.25"
                              max={Number(order.allocatedToday.toFixed(2))}
                              step="0.25"
                              placeholder={`max ${Number(order.allocatedToday.toFixed(1))}h`}
                              className="w-24 rounded border px-2 py-1 text-sm"
                              ref={(el) => {
                                progressRefs.current[
                                  `${order.id}-${row.date}`
                                ] = el;
                              }}
                              disabled={isUpdating}
                            />
                            <button
                              className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:bg-emerald-400"
                              disabled={isUpdating}
                              onClick={async () => {
                                const inputEl =
                                  progressRefs.current[
                                    `${order.id}-${row.date}`
                                  ];
                                if (!inputEl) return;
                                const completed = parseFloat(inputEl.value);
                                if (isNaN(completed) || completed <= 0) return;

                                setIsUpdating(true);
                                try {
                                  const res = await fetch(
                                    "/api/admin/capacity/progress",
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        orderId: order.id,
                                        date: row.date,
                                        completedHours: completed,
                                      }),
                                    },
                                  );
                                  if (!res.ok) {
                                    const err = await res
                                      .json()
                                      .catch(() => ({}));
                                    alert(
                                      err.error ?? "Failed to update progress",
                                    );
                                    return;
                                  }
                                  const result = await res.json();
                                  // Optimistically update the display without a full reload
                                  setProgressOverrides((prev) => ({
                                    ...prev,
                                    [overrideKey]: result.completedHours,
                                  }));
                                  inputEl.value = "";
                                } finally {
                                  setIsUpdating(false);
                                }
                              }}
                            >
                              Update
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
    </div>
  );
}
