"use client";

import { signIn } from "next-auth/react";

export function LoginForm() {
  return (
    <button
      onClick={() =>
        signIn("google", {
          callbackUrl: "/profile",
        })
      }
      className="w-full rounded-lg bg-rose-700 p-3 text-white"
    >
      Continue with Google
    </button>
  );
}
