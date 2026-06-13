import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCustomerSession } from "@/lib/auth";

export async function POST() {
  // const user = await prisma.user.create({
  //   data: {
  //     isGuest: true,
  //   },
  // });
  // await createCustomerSession(user.id);
  // return NextResponse.json({
  //   success: true,
  // });
}
