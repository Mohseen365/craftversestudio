"use client";

import { ProductDto } from "@/types/product";
import { useState } from "react";
import { ProductForm } from "./ProductForm";
import { ProductItem } from "./ProductItem";

export function ProductsPanel({ products }: { products: ProductDto[] }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <button onClick={() => setShowForm((s) => !s)}>Create Product</button>

      {showForm && <ProductForm onClose={() => setShowForm(false)} />}

      <ul>
        {products.map((product) => (
          <ProductItem key={product.id} product={product} />
        ))}
      </ul>
    </>
  );
}
