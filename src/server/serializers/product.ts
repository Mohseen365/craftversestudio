import { ProductDto } from "@/types/product";

export function serializeProduct(product: {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: number;
  productionHours: { toNumber(): number };
  active: boolean;
  imageUrl: string;
  instagramUrl: string | null;
  orderCount: number;
}): ProductDto {
  return {
    ...product,
    productionHours: product.productionHours.toNumber(),
  };
}
