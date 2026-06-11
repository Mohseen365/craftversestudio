import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPassword, createAdminSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!password || !(await verifyAdminPassword(password))) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  await createAdminSession();
  return NextResponse.json({ success: true });
}
