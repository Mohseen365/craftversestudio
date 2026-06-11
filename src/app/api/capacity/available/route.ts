import { NextResponse } from "next/server";
import { getAvailableDates } from "@/lib/capacity";

export async function GET() {
  const dates = await getAvailableDates(45);
  return NextResponse.json({
    dates: dates.map((d) => ({
      date: d.date.toISOString(),
      maximumCapacity: d.maximumCapacity,
      booked: d.booked,
      remaining: d.remaining,
      available: d.available,
    })),
  });
}
