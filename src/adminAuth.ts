import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const session = await auth();

  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    redirect("/");
  }

  return session;
}
export async function isAdminAuthenticated() {
  const session = await auth();

  return session?.user?.email === process.env.ADMIN_EMAIL;
}
