"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";
// import { Decimal } from "@prisma/client/runtime/library";

type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  active: boolean;
  imageUrl: string;
  instagramUrl: string;
  productionDays: string;
  description: string;
};

export function ProductsPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);

    const payload = {
      name: fd.get("name"),
      category: fd.get("category"),
      description: fd.get("description"),
      price: Number(fd.get("price")),
      active: true,
      productionDays: fd.get("productionDays")?.toString() ?? "1",
      imageUrl: fd.get("imageUrl") || undefined,
      instagramUrl: fd.get("instagramUrl") || undefined,
    };

    if (editingProduct) {
      await fetch(`/api/admin/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setEditingProduct(null);
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
        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-2xl border bg-white p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              name="name"
              placeholder="Product name"
              required
              className="rounded-lg border px-3 py-2 text-sm"
              defaultValue={editingProduct?.name}
            />
            <input
              name="category"
              placeholder="Category (Rose, Premium...)"
              required
              className="rounded-lg border px-3 py-2 text-sm"
              defaultValue={editingProduct?.category}
            />
            <input
              name="price"
              type="number"
              placeholder="Price (₹)"
              required
              className="rounded-lg border px-3 py-2 text-sm"
              defaultValue={editingProduct?.price}
            />
            <input
              name="productionDays"
              type="number"
              placeholder="Production days"
              // value={1}
              step="0.01" // allows decimals like 1.0, 10.25
              className="rounded-lg border px-3 py-2 text-sm"
              defaultValue={editingProduct?.productionDays?.toString() ?? "1"}
            />
            <input
              name="imageUrl"
              placeholder="Image URL (optional)"
              className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
              defaultValue={editingProduct?.imageUrl}
            />
            <input
              name="instagramUrl"
              placeholder="instagram URL (optional)"
              className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
              defaultValue={editingProduct?.instagramUrl}
            />
          </div>
          <textarea
            name="description"
            placeholder="Description"
            required
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            defaultValue={editingProduct?.description}
          />
          <button
            type="submit"
            className="rounded-lg bg-rose-700 px-4 py-2 text-sm text-white"
          >
            Save product
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-8 text-stone-500">Loading...</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {products.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl border bg-white p-4"
            >
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-stone-500">
                  {p.category} · {formatPrice(p.price)} ·{" "}
                  {p.active ? "Active" : "Archived"}
                </p>
              </div>
              <div className="flex gap-3">
                {p.active && (
                  <button
                    onClick={() => {
                      setEditingProduct(p); // set product to edit
                      setShowForm(true); // open the form
                    }}
                    className="text-sm text-blue-500"
                  >
                    Edit
                  </button>
                )}
                {p.active && (
                  <button
                    onClick={() => archive(p.id)}
                    className="text-sm text-red-500"
                  >
                    Archive
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
