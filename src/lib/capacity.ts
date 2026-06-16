import { addDays } from "./utils";

/**
 * These are the only two functions from this file still in active use.
 * They are imported by src/app/api/orders/[id]/accept/route.ts.
 *
 * All other capacity helpers (getPlanningRows, getUsedCapacity,
 * getCapacityForDeadline, getAvailableDates, getDailyProductionCapacity,
 * releaseCapacityReservation, etc.) have been removed — the active
 * scheduling engine in lib/scheduler.ts handles everything directly.
 */

export function calculateShippingDate(
  occasionDate: Date | string,
  shippingDurationDays: number
): Date {
  return addDays(occasionDate, -shippingDurationDays);
}

export function calculateProductionDeadline(shippingDate: Date | string): Date {
  return addDays(shippingDate, -1);
}
