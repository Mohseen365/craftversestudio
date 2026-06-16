import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPassword, createAdminSession } from "@/lib/auth";

// Simple in-memory rate limiter: max 5 attempts per IP per 60 seconds.
// Resets on server restart (acceptable for a single-admin tool).
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute." },
      { status: 429 }
    );
  }

  const { password } = await req.json();

  if (!password || !(await verifyAdminPassword(password))) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Clear attempts on successful login
  attempts.delete(ip);

  await createAdminSession();
  return NextResponse.json({ success: true });
}
