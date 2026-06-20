import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCustomerSession, getCurrentUserId } from "@/lib/auth";

export async function POST() {
  const existingUserId = await getCurrentUserId();

  if (existingUserId) {
    return NextResponse.json({ success: true, userId: existingUserId });
  }

  const user = await prisma.user.create({
    select: { id: true },
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
