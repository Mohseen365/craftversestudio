import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";

const productSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  description: z.string().min(10),
  price: z.number().int().positive(),
  productionDays: z.number().int().min(1).default(1),
  imageUrl: z.string().optional(),
  active: z.boolean().default(true),
});

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    include: { images: { orderBy: { sortOrder: "asc" } } },
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
        images: body.imageUrl
          ? { create: { imageUrl: body.imageUrl, sortOrder: 0 } }
          : undefined,
      },
      include: { images: true },
    });

    return NextResponse.json({ product });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid product data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
