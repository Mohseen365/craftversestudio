"use client";

import { signIn } from "next-auth/react";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-3xl font-semibold">Admin Sign In</h1>

      <button
        onClick={() =>
          signIn("google", {
            callbackUrl: "/admin/products",
          })
        }
        className="mt-6 w-full rounded-lg bg-black p-3 text-white"
      >
        Continue with Google
      </button>
    </main>
  );
}
