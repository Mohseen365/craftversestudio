import Link from "next/link";
import { ACTIVE_STATUSES } from "./config";
import { PAST_STATUSES } from "./config";
import { CUSTOMER_STATUS_LABELS } from "./config";
import { OrderStatus } from "@prisma/client";

type Props = {
  orders: Array<{
    id: string;
    orderNumber: string;
    status: OrderStatus;
    createdAt: string;
    occasionDate: string | null;
    total: number;

    items: {
      // quantity: number;
      product: {
        name: string;
      };
    }[];
  }>;
};

export function OrdersList({ orders }: Props) {
  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));

  const pastOrders = orders.filter((o) => PAST_STATUSES.includes(o.status)); // !ACTIVE_STATUSES.includes(o.status));
  if (!orders.length) {
    return (
      <div className="rounded-3xl border border-dashed border-stone-300 p-10 text-center">
        <h2 className="text-xl font-medium">No Orders Yet</h2>

        <p className="mt-2 text-stone-500">
          Explore our bouquet collection and place your first order.
        </p>

        <Link
          href="/products"
          className="mt-5 inline-flex rounded-full bg-rose-700 px-5 py-2 text-white"
        >
          Browse Bouquets
        </Link>
      </div>
    );
  } else {
    return (
      <div className="mt-8 space-y-10">
        <section>
          <h2 className="text-lg font-semibold">Active Orders</h2>

          <div className="mt-4 space-y-4">
            {activeOrders.map((order) => (
              <Link
                key={order.id}
                href={`/track/${order.id}`}
                className="block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:border-rose-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {order.items[0]?.product.name ?? "Bouquet"}
                    </p>

                    <p className="text-sm text-stone-500">
                      #{order.orderNumber}
                    </p>
                    <p className="text-sm text-stone-500">#{order.total}</p>

                    {order.occasionDate && (
                      <p className="mt-2 text-sm text-stone-500">
                        Delivery:{" "}
                        {new Date(order.occasionDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <span className="rounded-full bg-rose-50 px-3 py-1 text-sm text-rose-700">
                    {CUSTOMER_STATUS_LABELS[order.status]}
                  </span>
                  <span className="text-sm text-rose-700">View Details →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Previous Orders</h2>

          <div className="mt-4 space-y-4">
            {pastOrders.map((order) => (
              <Link
                key={order.id}
                href={`/track/${order.id}`}
                className="block rounded-2xl border border-stone-200 bg-white p-5"
              >
                <p className="font-medium">
                  {order.items[0]?.product.name ?? "Bouquet"}
                </p>

                <p className="text-sm text-stone-500">#{order.orderNumber}</p>
                <span className="text-sm text-rose-700">View Details →</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    );
  }
}
