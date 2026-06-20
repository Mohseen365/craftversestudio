"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
// import { getCurrentUserId } from "@/lib/auth";

type OrderFormProps = {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
  };
};

const OCCASIONS = [
  "Birthday",
  "Anniversary",
  "Wedding",
  "Valentine",
  "Mother's Day",
  "Just Because",
  "Other",
];

export function OrderForm({ product }: OrderFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);

  const subtotal = useMemo(
    () => product.price * quantity,
    [product.price, quantity],
  );
  console.log("in OrderForm");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    console.log("in handleSubmit");

    startTransition(async () => {
      try {
        // let customerId = await getCurrentUserId();
        // if (!customerId) {
        //   const guestRes = await fetch("/api/customer/guest", {
        //     method: "POST",
        //   });
        //   const guestData = await guestRes.json();
        //   if (!guestRes.ok || !guestData.userId) {
        //     throw new Error(guestData.error ?? "Could not start guest order");
        //   }
        //   customerId = guestData.userId;
        // }
        console.log("in startTransition");
        console.log("calling api/orders");

        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            address: formData.get("address"),
            city: formData.get("city"),
            pincode: formData.get("pincode"),
            state: formData.get("state"),
            occasionType: formData.get("occasionType"),
            occasionDate: formData.get("occasionDate"),
            quantity,
            notes: formData.get("Configuration"),
          }),
        });

        const data = await res.json();
        console.log("get res from api/orders");

        if (!res.ok) {
          console.log("res is not ok from api/orders");
          throw new Error(data.error ?? "Failed to create order");
        }
        console.log("res is ok from api/orders");
        console.log("go to login");

        router.push(
          `/login?orderId=${data.orderId}&orderNumber=${data.orderNumber}`,
        );
      } catch (err) {
        console.log("catch block of startTransition");

        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="State" name="state" required />
        <Field label="City" name="city" required />
      </div>
      <div>
        <Field label="Pincode" name="pincode" required />
      </div>
      <Field label="Address" name="address" required />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-stone-700">
            Occasion type
          </label>
          <select
            name="occasionType"
            className="mt-1 w-full rounded-xl border border-stone-200 px-4 py-2 text-sm"
          >
            {OCCASIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <Field label="Delivery date" name="occasionDate" type="date" required />
      </div>

      <div>
        <div>
          <label className="block text-sm font-medium text-stone-700">
            Quantity
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-stone-200 px-4 py-2 text-sm"
          />
        </div>
      </div>

      <Field label="Configuration (Optional)" name="Configuration" />

      <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-6">
        <p className="text-sm text-stone-600">
          {product.name} × {quantity}
        </p>
        <p className="mt-2 text-xl font-medium">{formatPrice(subtotal)}</p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-rose-700 py-3 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-50 transition"
      >
        {isPending ? "Creating order..." : "Continue to payment"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-stone-200 px-4 py-2 text-sm focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
      />
    </div>
  );
}
