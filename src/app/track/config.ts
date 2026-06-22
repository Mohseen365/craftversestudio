import { OrderStatus } from "@prisma/client";
export const ACTIVE_STATUSES = [
  "PENDING_REVIEW",
  "WAITLISTED",
  "ACCEPTED",
  "PAYMENT_PENDING",
  "PAYMENT_SUBMITTED",
  "PAYMENT_VERIFICATION",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
  "SHIPPED",
];
export const PAST_STATUSES = [
  "DELIVERED",
  "REJECTED",
  "PAYMENT_REJECTED",
  // "WAITLISTED",
  "CANCELLED",
  "REFUNDED",
];

export const TIMELINE_STEPS = [
  "Order In Review",
  "Order Is Confirmed",
  "Payment Is Verified",
  "In Production",
  "Ready",
  "Shipped",
  "Delivered",
];

export const STATUS_PROGRESS: Record<OrderStatus, number> = {
  PENDING_REVIEW: 0,

  ACCEPTED: 1,
  REJECTED: 1,
  PAYMENT_PENDING: 1,
  PAYMENT_SUBMITTED: 1,
  PAYMENT_VERIFICATION: 1,

  CONFIRMED: 2,

  IN_PRODUCTION: 3,

  READY_TO_SHIP: 4,

  SHIPPED: 5,

  DELIVERED: 6,

  PAYMENT_REJECTED: 1,
  WAITLISTED: 0,
  CANCELLED: 0,
  REFUNDED: 6,
};

export const CUSTOMER_STATUS_LABELS = {
  PENDING_REVIEW: "Order Under Review",
  ACCEPTED: "Order Accepted",

  PAYMENT_PENDING: "Payment Required",
  PAYMENT_SUBMITTED: "Payment Submitted",
  PAYMENT_VERIFICATION: "Payment Verification",

  CONFIRMED: "Order Confirmed",

  IN_PRODUCTION: "Being Crafted",
  READY_TO_SHIP: "Ready for Dispatch",
  SHIPPED: "On the Way",

  DELIVERED: "Delivered",

  WAITLISTED: "Waiting List",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",

  PAYMENT_REJECTED: "Payment Rejected",
  REJECTED: "Unable to Accept Order",
};

export const STATUS_MESSAGES = {
  PENDING_REVIEW: {
    title: "Order Under Review",
    description: "We are reviewing your order details.",
  },

  ACCEPTED: {
    title: "Order Accepted",
    description: "Your order has been accepted.",
  },

  REJECTED: {
    title: "Order Rejected",
    description: "Unfortunately, we cannot fulfill this order.",
  },

  PAYMENT_PENDING: {
    title: "Payment Required",
    description: "Complete payment to confirm your bouquet production slot.",
  },

  PAYMENT_SUBMITTED: {
    title: "Payment Submitted",
    description: "Your payment proof has been submitted successfully.",
  },

  PAYMENT_VERIFICATION: {
    title: "Payment Verification",
    description: "We are reviewing your payment proof.",
  },

  PAYMENT_REJECTED: {
    title: "Payment Rejected",
    description: "Your payment proof could not be verified.",
  },

  CONFIRMED: {
    title: "Order Confirmed",
    description: "Your bouquet has been scheduled for production.",
  },

  IN_PRODUCTION: {
    title: "Being Crafted 🌹",
    description: "Our florists are preparing your bouquet.",
  },

  READY_TO_SHIP: {
    title: "Ready for Dispatch",
    description: "Your bouquet is prepared and will be shipped shortly.",
  },

  SHIPPED: {
    title: "Shipped",
    description: "Your bouquet is on the way.",
  },

  DELIVERED: {
    title: "Delivered 🎉",
    description: "Your bouquet has been delivered successfully.",
  },

  WAITLISTED: {
    title: "Waitlisted",
    description: "Your order is currently on the waitlist.",
  },

  CANCELLED: {
    title: "Order Cancelled",
    description: "This order has been cancelled.",
  },

  REFUNDED: {
    title: "Refunded",
    description: "A refund has been processed for this order.",
  },
} satisfies Record<OrderStatus, { title: string; description: string }>;
