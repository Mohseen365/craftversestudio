import { format } from "date-fns";

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "d MMMM yyyy");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function generateOrderNumber(): string {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BQ-${now.slice(-4)}${rand}`;
}

export function toDateOnly(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date | string, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return toDateOnly(d);
}

export function getOrderDeadlines(
  occasionDate: Date | string | null,
  shippingDurationDays: number | null | undefined
) {
  if (!occasionDate || shippingDurationDays === null || shippingDurationDays === undefined) {
    return {
      productionDeadline: null,
      shippingDate: null,
      productionStartDate: null,
    };
  }

  const occasion = toDateOnly(new Date(occasionDate));
  const shippingDate = addDays(occasion, -Math.max(shippingDurationDays, 0));
  const productionDeadline = addDays(shippingDate, -1);

  return {
    productionDeadline,
    shippingDate,
    productionStartDate: productionDeadline,
  };
}

export const PRICE_FILTERS = [
  { label: "All prices", min: 0, max: Infinity },
  { label: "₹0 – ₹500", min: 0, max: 500 },
  { label: "₹500 – ₹1000", min: 500, max: 1000 },
  { label: "₹1000 – ₹2000", min: 1000, max: 2000 },
  { label: "₹2000+", min: 2000, max: Infinity },
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Order is in Review to accept or reject",
  ACCEPTED: "Order is ACCEPTED",
  REJECTED: "Order is REJECTED",
  PAYMENT_PENDING: "Payment is Pending",
  PAYMENT_SUBMITTED: "PAYMENT is SUBMITTED",
  PAYMENT_VERIFICATION: "Payment Verification",
  PAYMENT_REJECTED: "PAYMENT is REJECTED",
  REFUNDED: "Refunded",
  CONFIRMED: "Confirmed",
  IN_PRODUCTION: "In Production",
  READY_TO_SHIP: "Ready to Ship",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  WAITLISTED: "Waitlisted",
  CANCELLED: "Cancelled",
};
