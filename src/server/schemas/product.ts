import { Decimal } from "@prisma/client/runtime/library";
import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  description: z.string().min(10),
  price: z.coerce.number().int().positive(),

  productionHours: z.coerce
    .number()
    .finite()
    .transform((v) => new Decimal(v)),

  imageUrl: z.string().default(""),
  instagramUrl: z.string().optional(),
  active: z.boolean().default(true),
});
