import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.order.update({
    where: { id },
    data: {
      status: "ACCEPTED",
    },
  });

  return NextResponse.json({ success: true });
}
