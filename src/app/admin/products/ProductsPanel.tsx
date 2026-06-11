"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  active: boolean;
  images: Array<{ imageUrl: string }>;
};

export function ProductsPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/products");
    const data = await res.json();
    setProducts(data.products ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        category: fd.get("category"),
        description: fd.get("description"),
        price: Number(fd.get("price")),
        productionDays: Number(fd.get("productionDays")),
        imageUrl: fd.get("imageUrl") || undefined,
      }),
    });
    setShowForm(false);
    load();
  }

  async function archive(id: string) {
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <button
        onClick={() => setShowForm(!showForm)}
        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white"
      >
        {showForm ? "Cancel" : "Create product"}
      </button>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-6 space-y-4 rounded-2xl border bg-white p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <input name="name" placeholder="Product name" required className="rounded-lg border px-3 py-2 text-sm" />
            <input name="category" placeholder="Category (Rose, Premium...)" required className="rounded-lg border px-3 py-2 text-sm" />
            <input name="price" type="number" placeholder="Price (₹)" required className="rounded-lg border px-3 py-2 text-sm" />
            <input name="productionDays" type="number" placeholder="Production days" value={1} className="rounded-lg border px-3 py-2 text-sm" />
            <input name="imageUrl" placeholder="Image URL (optional)" className="rounded-lg border px-3 py-2 text-sm sm:col-span-2" />
          </div>
          <textarea name="description" placeholder="Description" required rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-rose-700 px-4 py-2 text-sm text-white">Save product</button>
        </form>
      )}

      {loading ? (
        <p className="mt-8 text-stone-500">Loading...</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {products.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-xl border bg-white p-4">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-stone-500">{p.category} · {formatPrice(p.price)} · {p.active ? "Active" : "Archived"}</p>
              </div>
              {p.active && (
                <button onClick={() => archive(p.id)} className="text-sm text-red-500">Archive</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
