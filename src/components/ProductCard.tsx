import Link from "next/link";
import { formatPrice } from "@/lib/utils";

type ProductCardProps = {
  id: string;
  name: string;
  slug: string;
  price: number;
  category: string;
  imageUrl?: string | null;
};

export function ProductCard({
  name,
  slug,
  price,
  category,
  imageUrl,
}: ProductCardProps) {
  return (
    <Link
      href={`/products/${slug}`}
      className="group overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm transition hover:shadow-md hover:border-rose-200"
    >
      <div className="aspect-[4/5] bg-gradient-to-br from-rose-50 to-stone-100 overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl text-rose-200">
            🌷
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-wide text-rose-500">
          {category}
        </p>
        <h3 className="mt-1 font-serif text-lg text-stone-800 group-hover:text-rose-800">
          {name}
        </h3>
        <p className="mt-2 font-medium text-stone-900">{formatPrice(price)}</p>
      </div>
    </Link>
  );
}
