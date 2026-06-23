import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRedirectDestination } from "@/lib/redirect-cookie";
import { clearRedirectDestination } from "@/lib/redirect-cookie";
import { z } from "zod";
const schema = z.object({
  mobileNo: z.string().regex(/^\d{10,15}$/),
  instagramUsername: z.string().optional(),
});
export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const data = schema.parse(body);
  const mobileNo = String(data.mobileNo ?? "").trim();
  const instagramUsername = String(data.instagramUsername ?? "").trim();

  if (!mobileNo) {
    return NextResponse.json(
      { error: "Mobile number is required" },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      mobileNo,
      instagramUsername: instagramUsername || null,
    },
  });
  const redirectTo = (await getRedirectDestination()) ?? "/catalog";

  await clearRedirectDestination();
  return NextResponse.json({
    success: true,
    redirectTo,
  });
}
