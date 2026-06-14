"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";

// type AvailableDate = {
//   date: string;
//   remaining: number;
//   available: boolean;
// };

type OrderFormProps = {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
  };
  // availableDates: AvailableDate[];
  userId: string;
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

export function OrderForm({
  product,
  /*availableDates*/ userId,
}: OrderFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  // const [deliveryDate, setDeliveryDate] = useState(
  //   availableDates.find((d) => d.available)?.date ?? ""
  // );

  const subtotal = product.price * quantity;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      let customerId = userId;
      if (!customerId) {
        const guestRes = await fetch("/api/customer/guest", { method: "POST" });
        const guestData = await guestRes.json();
        if (!guestRes.ok || !guestData.userId) {
          throw new Error(guestData.error ?? "Could not start guest order");
        }
        customerId = guestData.userId;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: customerId,
          productId: product.id,
          // fullName: formData.get("fullName"),
          // instagramUsername: formData.get("instagramUsername"),
          // mobileNo: formData.get("mobileNo"),
          // email: formData.get("email"),
          address: formData.get("address"),
          city: formData.get("city"),
          pincode: formData.get("pincode"),
          state: formData.get("state"),
          occasionType: formData.get("occasionType"),
          occasionDate: formData.get("occasionDate"),
          // deliveryDate,
          quantity,
          // giftMessage: formData.get("giftMessage"),
          notes: formData.get("Configuration"),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create order");

      // router.push(
      //   `/order/${product.slug}/payment?orderId=${data.orderId}&orderNumber=${data.orderNumber}`
      // );
      router.push(
        `/login?orderId=${data.orderId}&productId=${product.id}&orderNumber=${data.orderNumber}&userId=${data.userId}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* <Field label="Full name" name="fullName" required />
        <Field
          label="Instagram username"
          name="instagramUsername"
          placeholder="@username"
        />
        <Field label="mobileNo" name="mobileNo" type="tel" required />
        <Field label="Email" name="email" type="email" /> */}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="State" name="state" required />
        <Field label="City" name="city" required />
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

      <div className="grid gap-4 sm:grid-cols-2">
        {/* <div>
          <label className="block text-sm font-medium text-stone-700">
            Delivery date
          </label>
          <select
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-stone-200 px-4 py-2 text-sm"
          >
            <option value="">Select a date</option>
            {availableDates.map((d) => (
              <option key={d.date} value={d.date} disabled={!d.available}>
                {formatDate(d.date)} —{" "}
                {d.available ? `${d.remaining} left` : "Full"}
              </option>
            ))}
          </select>
        </div> */}
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

      {/* <Field label="Gift message" name="giftMessage" /> */}
      <Field label="Configuration" name="Configuration" />

      <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-6">
        <p className="text-sm text-stone-600">
          {product.name} × {quantity}
        </p>
        <p className="mt-2 text-xl font-medium">{formatPrice(subtotal)}</p>
        {/* <p className="mt-2 text-xs text-stone-500">
          You&apos;ll upload payment proof on the next step.
        </p> */}
      </div>

      <button
        type="submit"
        disabled={loading /*|| !deliveryDate*/}
        className="w-full rounded-full bg-rose-700 py-3 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-50"
      >
        {loading ? "Creating order..." : "Continue to payment"}
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
