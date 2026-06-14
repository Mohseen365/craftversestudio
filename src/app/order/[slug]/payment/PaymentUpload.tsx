"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PaymentUpload({
  orderId,
  orderNumber,
  mobileNo,
}: {
  orderId: string;
  orderNumber: string;
  userId: string;
  mobileNo: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const file = formData.get("screenshot") as File;
    if (!file?.size) {
      setError("Please upload a payment screenshot");
      setLoading(false);
      return;
    }

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error ?? "Upload failed");

      const paymentRes = await fetch(`/api/orders/${orderId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenshotUrl: uploadJson.url }),
      });
      const paymentJson = await paymentRes.json();
      if (!paymentRes.ok)
        throw new Error(paymentJson.error ?? "Payment upload failed");

      router.push(`/track?orderNumber=${orderNumber}&mobileNo=${mobileNo}`);
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

      <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-6">
        <p className="text-sm text-stone-600">Order number</p>
        <p className="mt-1 font-mono text-lg font-medium">{orderNumber}</p>
        <p className="text-sm text-stone-600">Mobile number</p>
        <p className="mt-1 font-mono text-lg font-medium">{mobileNo}</p>
        <p className="mt-4 text-sm text-stone-500">
          Pay via UPI/bank transfer, then upload your payment screenshot below.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">
          Payment screenshot
        </label>
        <input
          name="screenshot"
          type="file"
          accept="image/*"
          required
          className="mt-2 block w-full text-sm text-stone-500 file:mr-4 file:rounded-full file:border-0 file:bg-rose-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-rose-700"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-rose-700 py-3 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Submit payment proof"}
      </button>
    </form>
  );
}
