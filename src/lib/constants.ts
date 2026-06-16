export const SCHEDULABLE_STATUSES = [
  "ACCEPTED",
  "PAYMENT_PENDING",
  "PAYMENT_SUBMITTED",
  "PAYMENT_VERIFICATION",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
] as const;

export const INACTIVE_STATUSES = [
  "CANCELLED",
  "REFUNDED",
  "REJECTED",
  "SHIPPED",
  "DELIVERED",
  "PAYMENT_REJECTED",
] as const;

/** Default daily production capacity (in bouquet-days). Overridden per-date in the Capacity table. */
export const DAILY_PRODUCTION_CAPACITY = 1;
