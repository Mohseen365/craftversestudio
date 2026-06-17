import { prisma } from "@/lib/prisma";

export async function trackEvent({
  userId,
  productId,
  eventType,
  metadata,
}: {
  userId?: string;
  productId?: string;
  eventType: string;
  metadata?: any;
}) {
  // Skip event tracking during build phase to avoid database connection exhaustion
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  try {
    await prisma.event.create({
      data: {
        userId,
        productId,
        eventType,
        metadata,
      },
    });
  } catch (error) {
    console.error("Event tracking failed", error);
  }
}
