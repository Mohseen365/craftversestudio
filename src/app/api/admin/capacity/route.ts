import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { toDateOnly } from "@/lib/utils";

const capacitySchema = z.object({
  date: z.string(),
  maximumCapacity: z.number().int().min(0),
});

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const capacities = await prisma.capacity.findMany({
    include: { reservations: true },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({
    capacities: capacities.map((c) => {
      const booked = c.reservations.reduce((sum, r) => sum + r.quantity, 0);
      return {
        id: c.id,
        date: c.date.toISOString(),
        maximumCapacity: c.maximumCapacity,
        booked,
        remaining: c.maximumCapacity - booked,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = capacitySchema.parse(await req.json());
    const date = toDateOnly(new Date(body.date));

    const capacity = await prisma.capacity.upsert({
      where: { date },
      create: { date, maximumCapacity: body.maximumCapacity },
      update: { maximumCapacity: body.maximumCapacity },
    });

    return NextResponse.json({ capacity });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to set capacity" }, { status: 500 });
  }
}
