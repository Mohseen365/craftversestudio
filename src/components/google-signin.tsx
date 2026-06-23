"use client";

import { signIn } from "next-auth/react";

export default function GoogleSignIn() {
  return (
    <button
      onClick={() => signIn("google")}
      className="rounded-lg bg-black px-4 py-2 text-white"
    >
      Continue with Google
    </button>
  );
}
