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
