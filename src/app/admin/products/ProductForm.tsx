"use client";

import { useTransition } from "react";
import { ProductDto } from "@/types/product";

type ProductFormProps = {
  editingProduct: ProductDto | null;
  onSubmit: (formData: FormData) => Promise<void>;
};

export function ProductForm({ editingProduct, onSubmit }: ProductFormProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          await onSubmit(formData);
        })
      }
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
          step="0.01"
          placeholder="Production Hours"
          required
          className="rounded-lg border px-3 py-2 text-sm"
          defaultValue={editingProduct?.productionHours}
        />

        <input
          name="imageUrl"
          placeholder="Image URL"
          className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
          defaultValue={editingProduct?.imageUrl ?? ""}
        />

        <input
          name="instagramUrl"
          placeholder="Instagram URL (optional)"
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
        disabled={isPending}
        className="rounded-lg bg-rose-700 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {isPending
          ? "Saving..."
          : editingProduct
            ? "Update Product"
            : "Save Product"}
      </button>
    </form>
  );
}
