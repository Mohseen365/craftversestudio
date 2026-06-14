"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// import { getOrCreateCustomer } from "@/lib/auth"; //cannot use in client side
type LoginFormProps = {
  order: {
    id: string;
    number: string;
    productId: string;
    userId: string;
  };
};
export function LoginForm({ order }: LoginFormProps) {
  const router = useRouter();
  const [mobileNo, setMobileNo] = useState("");
  const [email, setEmail] = useState("");
  const [instagramUsername, setInstagramUsername] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    // const user = await getOrCreateCustomer();
    // const id = user.id;

    try {
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobileNo,
          email,
          instagramUsername,
          userId: order.userId,
          name,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Could not save contact details");
      }

      // router.push(
      //   `/order/${order.productId}/payment?orderId=${order.id}&orderNumber=${order.number}`
      // );

      router.push(`/track?orderNumber=${order.number}&mobileNo=${mobileNo}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }

    // if (res.ok) {
    //   window.location.href = "/";
    // }
  }

  // async function continueGuest() {
  //   const res = await fetch("/api/customer/guest", {
  //     method: "POST",
  //   });

  //   if (res.ok) {
  //     window.location.href = "/";
  //   }
  // }

  return (
    <form onSubmit={handleLogin} className="mt-8 space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border p-3"
        required
      />
      <input
        placeholder="Mobile Number"
        value={mobileNo}
        onChange={(e) => setMobileNo(e.target.value)}
        className="w-full rounded-lg border p-3"
        required
      />

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border p-3"
      />

      <input
        placeholder="Instagram Username"
        value={instagramUsername}
        onChange={(e) => setInstagramUsername(e.target.value)}
        className="w-full rounded-lg border p-3"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-rose-700 p-3 text-white"
      >
        {loading ? "Saving..." : "Continue"}
      </button>

      {/* <button onClick={continueGuest} className="w-full rounded-lg border p-3">
        Continue as Guest
      </button> */}
    </form>
  );
}
