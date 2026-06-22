"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type LoginFormProps = {
  order: {
    id: string;
    number: string;
    slug: string;
    // mobileNo: string;
  };
};

export function LoginForm({ order }: LoginFormProps) {
  const router = useRouter();
  const [mobileNo, setMobileNo] = useState("");
  const [email, setEmail] = useState("");
  const [instagramUsername, setInstagramUsername] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
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
            name,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Could not save contact details");
        }
        if (order.slug) {
          router.push(`/order/${order.slug}`);
        } else if (order.number) {
          console.log("going to /track/details");

          router.push(`/track/${order.id}`);
          // } else if (order.id) {
          //   router.push(`/order/${order.id}/payment?orderId=${order.id}`);
        } else {
          router.push(`/catalog`);
        }
      } catch (err) {
        console.log("catch block of startTransition");
        console.error("Login failed:", err);

        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={handleLogin} className="mt-8 space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border p-3 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
        required
      />
      <input
        placeholder="Mobile Number"
        value={mobileNo}
        onChange={(e) => setMobileNo(e.target.value)}
        className="w-full rounded-lg border p-3 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
        required
      />
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        className="w-full rounded-lg border p-3 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
      />
      <input
        placeholder="Instagram Username"
        value={instagramUsername}
        onChange={(e) => setInstagramUsername(e.target.value)}
        className="w-full rounded-lg border p-3 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
      />
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-rose-700 p-3 text-white hover:bg-rose-800 disabled:opacity-50 transition"
      >
        {isPending ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
