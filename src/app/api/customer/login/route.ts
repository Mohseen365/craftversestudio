import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCustomerSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { mobileNo, email, instagramUsername } = body;

  if (!mobileNo && !email && !instagramUsername) {
    return NextResponse.json(
      {
        error: "Enter mobile number, email, or Instagram username.",
      },
      { status: 400 }
    );
  }

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        mobileNo ? { mobileNo } : {},
        email ? { email } : {},
        instagramUsername ? { instagramUsername } : {},
      ],
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        mobileNo: mobileNo || null,
        email: email || null,
        instagramUsername: instagramUsername || null,
        isGuest: false,
      },
    });
  }

  await createCustomerSession(user.id);

  return NextResponse.json({
    success: true,
  });
}
