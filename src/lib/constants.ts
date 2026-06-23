// src/lib/constants.ts

// OLD
// export const DAILY_PRODUCTION_CAPACITY = 1; // 1 day

// NEW
export const DEFAULT_HOURS_PER_DAY = 8; // Default 8-hour workday
export const MIN_HOURS_PER_DAY = 0; // Minimum (holiday)
export const MAX_HOURS_PER_DAY = 24; // Maximum theoretical capacity
export const HOUR_PRECISION = 4; // Decimal places for hour calculations

// Statuses remain the same
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
