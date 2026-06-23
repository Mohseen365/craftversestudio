"use client";

import { formatPrice } from "@/lib/utils";
import { ProductDto } from "@/types/product";

type ProductItemProps = {
  product: ProductDto;
  onEdit: () => void;
  onArchive: () => Promise<void>;
};

export function ProductItem({ product, onEdit, onArchive }: ProductItemProps) {
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
          <button
            onClick={() => void onArchive()}
            className="text-sm text-red-500"
          >
            Archive
          </button>
        )}
      </div>
    </li>
  );
}
