export const EventType = {
  WEBSITE_OPENED: "WEBSITE_OPENED",

  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",

  PRODUCT_VIEW: "PRODUCT_VIEW",
  PRODUCT_FAVORITE: "PRODUCT_FAVORITE",

  ORDER_REQUESTED: "ORDER_REQUESTED",
  ORDER_Page: "ORDER_Page",
  ORDER_STARTED: "ORDER_STARTED",
  PAYMENT_UPLOADED: "PAYMENT_UPLOADED",
  PAYMENT_Page: "PAYMENT_Page",
  ORDER_COMPLETED: "ORDER_COMPLETED",

  TRACK_ORDER: "TRACK_ORDER",
} as const;

export type EventMetadata =
  | {
      method: "mobile" | "email" | "instagram" | "guest";
    }
  | {
      productName: string;
      category?: string;
      price?: number;
    }
  | {
      orderId: string;
      amount?: number;
      paymentMethod?: string;
    }
  | {
      trackingNumber?: string;
      orderId?: string;
    };
