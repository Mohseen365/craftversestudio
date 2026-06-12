"use client";

import { useState } from "react";

export function LoginForm() {
  const [value, setValue] = useState("");

  async function continueGuest() {
    await fetch("/api/customer/guest", {
      method: "POST",
    });

    window.location.href = "/";
  }

  return (
    <div className="mt-8 space-y-4">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Mobile / Email / Instagram"
        className="w-full rounded-lg border p-3"
      />

      <button className="w-full rounded-lg bg-rose-700 p-3 text-white">
        Continue
      </button>

      <button
        type="button"
        onClick={continueGuest}
        className="w-full rounded-lg border p-3"
      >
        Continue as Guest
      </button>
    </div>
  );
}
