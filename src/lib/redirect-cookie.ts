import { cookies } from "next/headers";

const REDIRECT_COOKIE = "redirectTo";

export async function setRedirectDestination(path: string) {
  const cookieStore = await cookies();

  cookieStore.set(REDIRECT_COOKIE, path, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });
}

export async function getRedirectDestination() {
  const cookieStore = await cookies();

  return cookieStore.get(REDIRECT_COOKIE)?.value ?? null;
}

export async function clearRedirectDestination() {
  const cookieStore = await cookies();

  cookieStore.delete(REDIRECT_COOKIE);
}
