// app/auth-required/route.ts

import { NextResponse } from "next/server";
import { setRedirectDestination } from "@/lib/redirect-cookie";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const destination = url.searchParams.get("to") ?? "/catalog";

  await setRedirectDestination(destination);

  return NextResponse.redirect(new URL("/login", url));
}
