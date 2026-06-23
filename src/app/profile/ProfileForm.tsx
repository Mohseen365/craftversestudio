"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ProfileFormProps = {
  user: {
    name: string;
    email: string;
    mobileNo: string;
    instagramUsername: string;
  };
};

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();

  const [mobileNo, setMobileNo] = useState(user.mobileNo);
  const [instagramUsername, setInstagramUsername] = useState(
    user.instagramUsername,
  );

  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    startTransition(async () => {
      try {
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mobileNo,
            instagramUsername,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Could not update profile");
        }

        router.push(data.redirectTo);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <input
        value={user.name}
        disabled
        className="w-full rounded-lg border bg-stone-100 p-3"
      />

      <input
        value={user.email}
        disabled
        className="w-full rounded-lg border bg-stone-100 p-3"
      />

      <input
        placeholder="Mobile Number"
        value={mobileNo}
        onChange={(e) => setMobileNo(e.target.value)}
        className="w-full rounded-lg border p-3 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
        required
      />

      <input
        placeholder="Instagram Username (optional)"
        value={instagramUsername}
        onChange={(e) => setInstagramUsername(e.target.value)}
        className="w-full rounded-lg border p-3 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-rose-700 p-3 text-white hover:bg-rose-800 disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}
