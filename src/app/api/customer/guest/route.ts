import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCustomerSession, getCurrentUser } from "@/lib/auth";

export async function POST() {
  const existing = await getCurrentUser();

  if (existing) {
    return NextResponse.json({ success: true, userId: existing.id });
  }

  const user = await prisma.user.create({
    data: {
      isGuest: true,
    },
  });

  await createCustomerSession(user.id);

  return NextResponse.json({
    success: true,
    userId: user.id,
  });
}
