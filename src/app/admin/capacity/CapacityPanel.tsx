"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";

type CapacityRow = {
  id: string;
  date: string;
  maximumCapacity: number;
  booked: number;
  remaining: number;
};

export function CapacityPanel() {
  const [rows, setRows] = useState<CapacityRow[]>([]);
  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState(10);

  async function load() {
    const res = await fetch("/api/admin/capacity");
    const data = await res.json();
    setRows(data.capacities ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/capacity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, maximumCapacity: capacity }),
    });
    setDate("");
    load();
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 rounded-2xl border bg-white p-6">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="rounded-lg border px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={0}
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
          placeholder="Capacity"
          className="rounded-lg border px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white">
          Set capacity
        </button>
      </form>

      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b text-stone-500">
            <th className="py-3">Date</th>
            <th className="py-3">Capacity</th>
            <th className="py-3">Booked</th>
            <th className="py-3">Remaining</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b">
              <td className="py-3">{formatDate(row.date)}</td>
              <td className="py-3">{row.maximumCapacity}</td>
              <td className="py-3">{row.booked}</td>
              <td className="py-3">
                <span className={row.remaining === 0 ? "text-red-600" : "text-emerald-600"}>
                  {row.remaining}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="mt-4 text-stone-500">No capacity dates configured yet.</p>
      )}
    </div>
  );
}
