import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Decimal } from "@/generated/prisma/runtime/library";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  price: z.number().int().positive().optional(),
  productionDays: z
    .string()
    .transform((val) => new Decimal(val))
    .optional(),

  active: z.boolean().optional(),
  imageUrl: z.string(),
  instagramUrl: z.string(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = updateSchema.parse(await req.json());

    const product = await prisma.product.update({
      where: { id },
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        price: true,
        productionDays: true,
        active: true,
        imageUrl: true,
        instagramUrl: true,
      },
      data: {
        name: body.name,
        category: body.category,
        description: body.description,
        price: body.price,
        productionDays: body.productionDays,
        active: body.active,
        imageUrl: body.imageUrl,
        instagramUrl: body.instagramUrl,
      },
    });

    // Serialize Decimal for response
    const serialized = {
      ...product,
      productionDays: product.productionDays.toNumber(),
    };

    return NextResponse.json({ product: serialized });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.product.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
