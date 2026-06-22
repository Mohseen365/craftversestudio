import { formatDate } from "@/lib/utils";
import type { SerializedOrder } from "./actions";

interface OrderDatesTableProps {
  order: SerializedOrder;
}

export function OrderDatesTable({ order }: OrderDatesTableProps) {
  return (
    <table className="w-full min-w-[560px] border-collapse text-left text-sm">
      <thead className="border-b border-stone-100 text-stone-500">
        <tr>
          <th className="py-2 pr-4 font-medium">Order ID</th>
          <th className="py-2 pr-4 font-medium">Production deadline</th>
          <th className="py-2 pr-4 font-medium">Shipping date</th>
          <th className="py-2 pr-4 font-medium">Reach customer</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-stone-50">
          <td className="py-3 pr-4 font-mono text-xs">{order.id}</td>
          <td className="py-3 pr-4">
            {order.productionDeadline
              ? formatDate(order.productionDeadline)
              : "Not set"}
          </td>
          <td className="py-3 pr-4">
            {order.shippingDate ? formatDate(order.shippingDate) : "Not set"}
          </td>
          <td className="py-3 pr-4">
            {order.occasionDate ? formatDate(order.occasionDate) : "Not set"}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
