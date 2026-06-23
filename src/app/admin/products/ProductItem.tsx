"use client";

import { ProductDto } from "@/types/product";

export function ProductItem({ product }: { product: ProductDto }) {
  return (
    <li>
      <div>
        <p>{product.name}</p>

        <p>₹{product.price}</p>
      </div>
    </li>
  );
}
