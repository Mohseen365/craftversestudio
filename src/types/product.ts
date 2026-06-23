export type ProductDto = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: number;
  productionHours: number;
  active: boolean;
  imageUrl: string;
  instagramUrl: string | null;
  orderCount: number;
};
