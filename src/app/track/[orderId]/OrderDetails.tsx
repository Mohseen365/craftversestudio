import { formatDate } from "@/lib/utils";
import { OrderTimeline } from "./OrderTimeline";
import { OrderStatusCard } from "./OrderStatusCard";
import { STATUS_PROGRESS } from "../config";
import { OrderStatus } from "@prisma/client";
import { PaymentStatus } from "@prisma/client";
type OrderDetailsResult = {
  id: string;
  orderNumber: string;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  createdAt: string;
  shippingDate: string | null;
  deliveryDate: string | null;
  occasionDate: string | null;
  trackingNumber: string | null;
  productionDeadline: string | null;
  customizationCharge: number | null;
  deliveryCharge: number | null;
  urgentOrderCharge: number | null;
  subtotal: number;
  total: number | null;

  user: {
    mobileNo: string | null;
    id: string;
  };
  items: Array<{
    product: { name: string; productionHours: number };
    quantity: number;
  }>;
  payments: Array<{ status: PaymentStatus; screenshotUrl: string | null }>;
};

type Props = {
  order: OrderDetailsResult;
};

export function OrderDetails({ order }: Props) {
  const orderIdAndStatus = { id: order.id, status: order.status };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">Order</p>

          <h1 className="font-mono text-3xl font-medium">
            {order.orderNumber}
          </h1>

          <p className="mt-2 text-sm text-stone-500">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
      </div>

      {/* Action Card */}

      <OrderStatusCard order={orderIdAndStatus} />

      {/* Timeline */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-semibold">Order Progress</h2>

        <div className="mt-6">
          <OrderTimeline currentStep={STATUS_PROGRESS[order.status]} />
        </div>
      </div>

      {/* Delivery Information */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-semibold">Delivery Information</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {order.occasionDate && (
            <InfoItem
              label="Delivery Date"
              value={formatDate(order.occasionDate)}
            />
          )}

          {order.shippingDate && (
            <InfoItem
              label="Shipping Date"
              value={formatDate(order.shippingDate)}
            />
          )}

          {order.trackingNumber && (
            <InfoItem label="Tracking Number" value={order.trackingNumber} />
          )}

          {order.productionDeadline && (
            <InfoItem
              label="Production Deadline"
              value={formatDate(order.productionDeadline)}
            />
          )}
        </div>
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-semibold">Order Items</h2>

        <div className="mt-4 space-y-3">
          {order.items.map((item, i) => (
            <div key={i} className="rounded-xl border border-stone-200 p-4">
              <p className="font-medium">{item.product.name}</p>

              <p className="mt-1 text-sm text-stone-500">
                Quantity: {item.quantity}
              </p>
            </div>
          ))}
        </div>
      </div>
      {/* Price Information */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-semibold">Price Information</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <InfoItem
            label="Bouquet Collection Price"
            value={formatPrice(order.subtotal)}
          />

          {order.customizationCharge !== null && (
            <InfoItem
              label="Customization Charge"
              value={formatPrice(order.customizationCharge)}
            />
          )}

          {order.deliveryCharge !== null && (
            <InfoItem
              label="Delivery Charge"
              value={formatPrice(order.deliveryCharge)}
            />
          )}

          {order.urgentOrderCharge !== null && (
            <InfoItem
              label="Urgent Order Charge"
              value={formatPrice(order.urgentOrderCharge)}
            />
          )}

          {order.total !== null && (
            <InfoItem label="Total Price" value={formatPrice(order.total)} />
          )}
        </div>
      </div>
      {/* Payment */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="font-semibold">Payment Status</h2>

        <p className="mt-3 font-medium">{order.paymentStatus}</p>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-stone-500">{label}</p>

      <p className="font-medium">{value}</p>
    </div>
  );
}
const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
