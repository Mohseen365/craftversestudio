import { ORDER_STATUS_LABELS } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  PAYMENT_PENDING: "bg-amber-100 text-amber-800",
  PAYMENT_VERIFICATION: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  IN_PRODUCTION: "bg-blue-100 text-blue-800",
  READY_TO_SHIP: "bg-indigo-100 text-indigo-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  WAITLISTED: "bg-orange-100 text-orange-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-stone-100 text-stone-800",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABELS[status] ?? status;
  const color = STATUS_COLORS[status] ?? "bg-stone-100 text-stone-800";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
