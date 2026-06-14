import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCustomerSession, getCurrentUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const loginSchema = z.object({
  userId: z.string(),
  // productId: z.string(),
  name: z.string().min(2),
  instagramUsername: z.string().optional(),
  mobileNo: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
  // address: z.string().min(5),
  // city: z.string().min(2),
  // pincode: z.string().min(4),
  // state: z.string().min(2),
  // occasionType: z.string().optional(),
  // occasionDate: z.string().nullable().optional(),
  // deliveryDate: z.string(),
  // quantity: z.number().int().min(1).max(10),
  // giftMessage: z.string().optional(),
  // notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = loginSchema.parse({
    ...body,
  });

  const { mobileNo, email, instagramUsername, userId, name } = data;

  if (!mobileNo && !email && !instagramUsername) {
    return NextResponse.json(
      {
        error: "Enter mobile number, email, or Instagram username.",
      },
      { status: 400 }
    );
  }

  const guestUserId = userId;
  const currentUser = await getCurrentUser();
  const conditions: Prisma.UserWhereInput[] = [];

  if (mobileNo) conditions.push({ mobileNo });
  if (email) conditions.push({ email });
  if (instagramUsername) conditions.push({ instagramUsername });

  const existingUser =
    conditions.length > 0
      ? await prisma.user.findFirst({
          where: {
            OR: conditions,
          },
        })
      : null;

  if (existingUser) {
    try {
      const user = await prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          mobileNo: mobileNo || existingUser.mobileNo,
          email: email || existingUser.email,
          instagramUsername:
            instagramUsername || existingUser.instagramUsername,
          name: name || existingUser.name,
          isGuest: false,
        },
      });
      if (guestUserId && guestUserId !== user.id) {
        await prisma.$transaction([
          prisma.order.updateMany({
            where: { userId: guestUserId },
            data: { userId: user.id },
          }),
          prisma.address.updateMany({
            where: { userId: guestUserId },
            data: { userId: user.id },
          }),
        ]);
      }
      await createCustomerSession(user.id);
      return NextResponse.json({
        success: true,
        action: "updated_existing_user",
      });
    } catch (err) {
      console.error("updated_existing_user failed:", err);
      return NextResponse.json({
        success: false,
        action: "update_failed",
      });
    }
  } else if (currentUser) {
    try {
      const updatedUser = await prisma.user.update({
        where: {
          id: currentUser.id,
        },
        data: {
          mobileNo: mobileNo || currentUser.mobileNo,
          email: email || currentUser.email,
          instagramUsername: instagramUsername || currentUser.instagramUsername,
          name: name || currentUser.name,
          isGuest: false,
        },
      });
      await createCustomerSession(updatedUser.id);
      return NextResponse.json({
        success: true,
        action: "updated_current_user",
      });
    } catch (err) {
      console.error("updated_current_user failed:", err);
      return NextResponse.json({
        success: false,
        action: "update_failed",
      });
    }
  } else {
    try {
      const user = await prisma.user.create({
        data: {
          mobileNo: mobileNo || null,
          email: email || null,
          instagramUsername: instagramUsername || null,
          name: name || null,
          isGuest: false,
        },
      });
      await createCustomerSession(user.id);
      return NextResponse.json({
        success: true,
        action: "user_created",
      });
    } catch (err) {
      console.error("updated_current_user failed:", err);
      return NextResponse.json({
        success: false,
        action: "update_failed",
      });
    }
  }
}
