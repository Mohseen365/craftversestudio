import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const CUSTOMER_COOKIE = "bouquet_customer";

const COOKIE_NAME = "bouquet_admin_session";
const SESSION_VALUE = "authenticated";

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  if (adminPassword.startsWith("$2")) {
    return bcrypt.compare(password, adminPassword);
  }
  return password === adminPassword;
}

export async function createAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value === SESSION_VALUE;
}

export async function requireAdmin(): Promise<boolean> {
  return isAdminAuthenticated();
}

export async function getOrCreateCustomer() {
  const existingUser = await getCurrentUser();

  if (existingUser) {
    return existingUser;
  }

  const guestUser = await prisma.user.create({
    data: {
      isGuest: true,
    },
    select: { id: true },
  });

  await createCustomerSession(guestUser.id);

  return guestUser;
}

export async function createCustomerSession(userId: string) {
  const cookieStore = await cookies();

  cookieStore.set(CUSTOMER_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();

  const userId = cookieStore.get(CUSTOMER_COOKIE)?.value;

  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      mobileNo: true,
      email: true,
      instagramUsername: true,
    },
  });
}

export async function destroyCustomerSession() {
  const cookieStore = await cookies();

  cookieStore.delete(CUSTOMER_COOKIE);
}
