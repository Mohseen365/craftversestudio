import { NextRequest, NextResponse } from "next/server";
import { signOut } from "next-auth/react";

export async function POST(req: NextRequest) {
  await signOut();
  return NextResponse.redirect(new URL("/admin/login", req.nextUrl.origin));
}
