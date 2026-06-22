import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatDate, formatPrice } from "@/lib/utils";
import type { SerializedOrder } from "./actions";

interface OrderCardHeaderProps {
  order: SerializedOrder;
}

export function OrderCardHeader({ order }: OrderCardHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="font-mono font-medium">
          orderNumber: {order.orderNumber}
        </p>
        <p className="text-sm text-stone-600">
          Name: {order.user.name}, Mobile No: {order.user.mobileNo}
        </p>
        <p className="text-sm text-stone-500">
          Delivery:{" "}
          {order.occasionDate ? formatDate(order.occasionDate) : "Not set"} ·{" "}
          {order.subtotal ? formatPrice(order.subtotal) : 0}
        </p>
        <ul className="mt-2 text-sm text-stone-600">
          {order.items.map((item, i) => (
            <li key={i}>
              {item.product.name} × {item.quantity}
            </li>
          ))}
        </ul>
      </div>
      <OrderStatusBadge status={order.status} />
    </div>
  );
}
