import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { Decimal } from "@/generated/prisma/runtime/library";

const productSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  description: z.string().min(10),
  price: z.number().int().positive(),
  productionDays: z.coerce
  .string()
  .transform((val) => new Decimal(val)),
  imageUrl: z.string().default(""),
  instagramUrl: z.string().optional(),
  active: z.boolean().default(true),
});

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      productionDays: true,
      active: true,
      imageUrl: true,
      instagramUrl: true,
      orderCount: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = productSchema.parse(await req.json());
    const slug = slugify(body.name);

    const existing = await prisma.product.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug: finalSlug,
        category: body.category,
        description: body.description,
        price: body.price,
        productionDays: body.productionDays,
        active: body.active,
        imageUrl: body.imageUrl || "",
        instagramUrl: body.instagramUrl,
      },
    });

    return NextResponse.json({ product });
  } catch (err) {
    if (err instanceof z.ZodError) {
  console.error(err.flatten());

  return NextResponse.json(
    {
      error: "Invalid product data",
      details: err.flatten(),
    },
    { status: 400 }
  );
}
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
