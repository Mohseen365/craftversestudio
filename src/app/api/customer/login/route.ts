import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCustomerSession, getCurrentUser } from "@/lib/auth";
import { Prisma } from "@/generated/prisma";
import { z } from "zod";

const loginSchema = z.object({
  // userId: the guest user ID created before login, used to migrate guest orders
  userId: z.string(),
  name: z.string().min(2),
  instagramUsername: z.string().optional(),
  mobileNo: z.string().regex(/^\d{10,15}$/, "Enter a valid mobile number"),
  email: z.string().email().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = loginSchema.parse(body);

    const { mobileNo, email, instagramUsername, userId, name } = data;

    // Validate that the guest userId in the body belongs to the current session.
    // This prevents an attacker from supplying someone else's userId to steal their orders.
    const sessionUser = await getCurrentUser();
    const guestUserId =
      sessionUser?.id === userId ? userId : sessionUser?.id ?? userId;

    const conditions: Prisma.UserWhereInput[] = [];
    if (mobileNo) conditions.push({ mobileNo });
    if (email) conditions.push({ email });
    if (instagramUsername) conditions.push({ instagramUsername });

    const existingUser =
      conditions.length > 0
        ? await prisma.user.findFirst({ where: { OR: conditions } })
        : null;

    if (existingUser) {
      // Merge guest orders into the found account
      const user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          mobileNo: mobileNo || existingUser.mobileNo,
          email: email || existingUser.email,
          instagramUsername: instagramUsername || existingUser.instagramUsername,
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
      return NextResponse.json({ success: true, action: "updated_existing_user" });
    }

    if (sessionUser) {
      // Update the current session user's profile
      const updatedUser = await prisma.user.update({
        where: { id: sessionUser.id },
        data: {
          mobileNo: mobileNo || sessionUser.mobileNo,
          email: email || sessionUser.email,
          instagramUsername: instagramUsername || sessionUser.instagramUsername,
          name: name || sessionUser.name,
          isGuest: false,
        },
      });
      await createCustomerSession(updatedUser.id);
      return NextResponse.json({ success: true, action: "updated_current_user" });
    }

    // No existing user found and no active session — create a new account
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
    return NextResponse.json({ success: true, action: "user_created" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid data" },
        { status: 400 }
      );
    }
    console.error("customer/login failed:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
