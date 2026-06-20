import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const CUSTOMER_SECRET = process.env.CUSTOMER_SESSION_SECRET!;
const ADMIN_SECRET = process.env.ADMIN_SESSION_SECRET!;
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

  cookieStore.set(COOKIE_NAME, createSignedValue(SESSION_VALUE, ADMIN_SECRET), {
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

  const cookieValue = cookieStore.get(COOKIE_NAME)?.value;

  if (!cookieValue) {
    return false;
  }

  const value = verifySignedValue(cookieValue, ADMIN_SECRET);

  return value === SESSION_VALUE;
}

export async function requireAdmin(): Promise<boolean> {
  return isAdminAuthenticated();
}

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function createSignedValue(value: string, secret: string) {
  return `${value}.${sign(value, secret)}`;
}

function verifySignedValue(signedValue: string, secret: string): string | null {
  const [value, signature] = signedValue.split(".");

  if (!value || !signature) {
    return null;
  }

  const expectedSignature = sign(value, secret);

  return signature === expectedSignature ? value : null;
}

export async function createCustomerSession(userId: string) {
  const cookieStore = await cookies();

  cookieStore.set(CUSTOMER_COOKIE, createSignedValue(userId, CUSTOMER_SECRET), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(CUSTOMER_COOKIE)?.value;
  if (!cookieValue) {
    return null;
  }
  const userId = verifySignedValue(cookieValue, CUSTOMER_SECRET);
  if (!userId) {
    return null;
  }
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

export async function getCurrentUserId() {
  const cookieStore = await cookies();

  const cookieValue = cookieStore.get(CUSTOMER_COOKIE)?.value;

  if (!cookieValue) {
    return null;
  }

  return verifySignedValue(cookieValue, CUSTOMER_SECRET);
}

export async function getOrCreateCustomerId() {
  const existingUserId = await getCurrentUserId();

  if (existingUserId) {
    return existingUserId;
  }

  const guestUser = await prisma.user.create({
    data: {
      isGuest: true,
    },
    select: {
      id: true,
      isGuest: true,
      name: true,
      mobileNo: true,
      email: true,
      instagramUsername: true,
    },
  });

  await createCustomerSession(guestUser.id);

  return guestUser.id;
}

export async function destroyCustomerSession() {
  const cookieStore = await cookies();

  cookieStore.delete(CUSTOMER_COOKIE);
}
