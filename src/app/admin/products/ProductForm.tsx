"use client";

import { createProduct } from "@/actions/product-actions";
import { useTransition } from "react";

export function ProductForm({ onClose }: { onClose: () => void }) {
  const [pending] = useTransition();

  return (
    <form action={createProduct}>
      <input name="name" required />

      <input name="category" required />

      <input name="price" required />

      <input name="productionHours" required />

      <textarea name="description" />

      <button disabled={pending}>Save</button>
    </form>
  );
}
