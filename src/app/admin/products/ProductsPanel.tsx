"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProductDto } from "@/types/product";
import { ProductForm } from "./ProductForm";
import { ProductItem } from "./ProductItem";

type ProductsPanelProps = {
  products: ProductDto[];
};

export function ProductsPanel({ products }: ProductsPanelProps) {
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);

  async function handleSubmit(formData: FormData) {
    const payload = {
      name: formData.get("name"),
      category: formData.get("category"),
      description: formData.get("description"),
      price: formData.get("price"),
      productionHours: formData.get("productionHours"),
      imageUrl: formData.get("imageUrl"),
      instagramUrl: formData.get("instagramUrl") || undefined,
      active: true,
    };

    const url = editingProduct
      ? `/api/admin/products/${editingProduct.id}`
      : "/api/admin/products";

    const method = editingProduct ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error ?? "Something went wrong");
      return;
    }

    setEditingProduct(null);
    setShowForm(false);

    router.refresh();
  }

  async function archiveProduct(id: string) {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("Failed to archive");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <button
        onClick={() => {
          setEditingProduct(null);
          setShowForm((prev) => !prev);
        }}
        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white"
      >
        {showForm ? "Cancel" : "Create Product"}
      </button>

      {showForm && (
        <ProductForm editingProduct={editingProduct} onSubmit={handleSubmit} />
      )}

      <ul className="mt-8 space-y-3">
        {products.map((product) => (
          <ProductItem
            key={product.id}
            product={product}
            onEdit={() => {
              setEditingProduct(product);
              setShowForm(true);
            }}
            onArchive={() => archiveProduct(product.id)}
          />
        ))}
      </ul>
    </div>
  );
}
