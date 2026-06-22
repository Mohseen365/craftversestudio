"use client";

import { useState } from "react";
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
  instagramUrl: string | null;
  productionHours: number;
  description: string;
};

export function ProductsPanel({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  // async function load() {
  //   try {
  //     setLoading(true);

  //     const res = await fetch("/api/admin/products");
  //     const data = await res.json();

  //     if (!res.ok) {
  //       console.log(data);
  //       alert(JSON.stringify(data, null, 2));
  //       return;
  //     }

  //     setProducts(data.products ?? []);
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  // useEffect(() => {
  //   if (products !== initialProducts) {
  //     load();
  //   }
  // }, []);

  // const onUpdate = () => {
  //   load();
  // };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);

    const payload = {
      name: fd.get("name"),
      category: fd.get("category"),
      description: fd.get("description"),
      price: fd.get("price"),
      // price: Number(fd.get("price")),
      active: true,
      productionHours: fd.get("productionHours"),
      // productionHours: fd.get("productionHours")?.toString() ?? "1",
      imageUrl: fd.get("imageUrl"),
      instagramUrl: fd.get("instagramUrl") || undefined,
    };

    if (editingProduct) {
      const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === data.product.id ? data.product : p)),
        );
      }
    } else {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setProducts((prev) => [data.product, ...prev]);
        alert(JSON.stringify(data, null, 2));
        return;
      }
    }

    setEditingProduct(null);
    setShowForm(false);
    // load();
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
              name="productionHours"
              type="number"
              placeholder="Production Hours"
              // value={1}
              step="0.01" // allows decimals like 1.0, 10.25
              className="rounded-lg border px-3 py-2 text-sm"
              defaultValue={editingProduct?.productionHours}
              // defaultValue={editingProduct?.productionHours?.toString() ?? "1"}
            />
            <input
              name="imageUrl"
              placeholder="Image URL"
              className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
              defaultValue={editingProduct?.imageUrl ?? ""}
            />
            <input
              name="instagramUrl"
              placeholder="instagram URL (optional)"
              className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
              defaultValue={editingProduct?.instagramUrl ?? ""}
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
            <ProductItem
              key={p.id}
              product={p}
              onEdit={() => {
                setEditingProduct(p);
                setShowForm(true);
              }}
              onDelete={(id) =>
                setProducts((prev) =>
                  prev.map((deleteProduct) =>
                    deleteProduct.id === id
                      ? { ...deleteProduct, active: false }
                      : deleteProduct,
                  ),
                )
              }
              // onUpdate={onUpdate}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProductItem({
  product,
  onEdit,
  onDelete,
  // onUpdate,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: (id: string) => void;
  // onUpdate: () => void;
}) {
  async function archive() {
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      onDelete(product.id);
      // onUpdate();
    }
  }

  return (
    <li className="flex items-center justify-between rounded-xl border bg-white p-4">
      <div>
        <p className="font-medium">{product.name}</p>
        <p className="text-sm text-stone-500">
          {product.category} · {formatPrice(product.price)} ·{" "}
          {product.active ? "Active" : "Archived"}
        </p>
      </div>
      <div className="flex gap-3">
        {product.active && (
          <button onClick={onEdit} className="text-sm text-blue-500">
            Edit
          </button>
        )}
        {product.active && (
          <button onClick={archive} className="text-sm text-red-500">
            Archive
          </button>
        )}
      </div>
    </li>
  );
}
