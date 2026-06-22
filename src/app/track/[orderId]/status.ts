// export const STATUS_CONFIG = {
//   PAYMENT_PENDING: {
//     label: "Payment Required",
//     tone: "amber",
//     title: "Complete Your Payment",
//     description:
//       "Your bouquet slot is reserved temporarily. Complete payment to confirm production.",
//   },

//   PAYMENT_SUBMITTED: {
//     label: "Payment Submitted",
//     tone: "blue",
//     title: "Payment Received",
//     description: "We received your payment proof and will review it shortly.",
//   },

//   PAYMENT_VERIFICATION: {
//     label: "Payment Review",
//     tone: "blue",
//     title: "Verification In Progress",
//     description: "Our team is verifying your payment.",
//   },

//   ACCEPTED: {
//     label: "Order Confirmed",
//     tone: "green",
//     title: "Order Accepted",
//     description: "Your bouquet has been scheduled for production.",
//   },

//   IN_PRODUCTION: {
//     label: "In Production",
//     tone: "purple",
//     title: "Creating Your Bouquet",
//     description: "Our team is handcrafting your bouquet.",
//   },

//   READY: {
//     label: "Ready",
//     tone: "green",
//     title: "Ready For Delivery",
//     description: "Your bouquet is prepared and awaiting dispatch.",
//   },

//   DELIVERED: {
//     label: "Delivered",
//     tone: "green",
//     title: "Delivered Successfully",
//     description: "Your bouquet has been delivered.",
//   },

//   REJECTED: {
//     label: "Unavailable",
//     tone: "red",
//     title: "Order Cannot Be Accepted",
//     description: "The selected date exceeded available production capacity.",
//   },

//   PAYMENT_REJECTED: {
//     label: "Payment Rejected",
//     tone: "red",
//     title: "Payment Could Not Be Verified",
//     description: "Please submit a valid payment proof.",
//   },
// } as const;
export const ORDER_PROGRESS = {
  PAYMENT_PENDING: 0,
  PAYMENT_SUBMITTED: 1,
  PAYMENT_VERIFICATION: 1,
  ACCEPTED: 2,
  IN_PRODUCTION: 3,
  READY: 4,
  DELIVERED: 5,

  PAYMENT_REJECTED: 1,
  REJECTED: 0,
} as const;

export const TIMELINE_STEPS = [
  "Order Received",
  "Order Confirmed",
  "Payment Verified",
  "Production",
  "Ready",
  "Delivered",
];
