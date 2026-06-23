import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
const CUSTOMER_SECRET = process.env.CUSTOMER_SESSION_SECRET!;
const ADMIN_SECRET = process.env.ADMIN_SESSION_SECRET!;
const CUSTOMER_COOKIE = process.env.CUSTOMER_COOKIE!;
const COOKIE_NAME = process.env.COOKIE_NAME!;
const SESSION_VALUE = process.env.SESSION_VALUE!;
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
  console.log("in sign");
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}
function createSignedValue(value: string, secret: string) {
  console.log("in createSignedValue");
  return `${value}.${sign(value, secret)}`;
}
function verifySignedValue(signedValue: string, secret: string): string | null {
  const [value, signature] = signedValue.split(".");
  console.log("start verifySignedValue");
  if (!value || !signature) {
    return null;
  }
  console.log("splitten verifySignedValue and go to sign");
  const expectedSignature = sign(value, secret);
  console.log("out of sign and going out of verifySignedValue");
  return signature === expectedSignature ? value : null;
}
export async function createCustomerSession(userId: string) {
  const cookieStore = await cookies();
  console.log("in createCustomerSession and set cookieStore");
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
  console.log("in getCurrentUser and get cookieValue");
  if (!cookieValue) {
    console.log("in getCurrentUser and cookieValue is null");
    return null;
  }
  console.log("going in verifySignedValue");
  const userId = verifySignedValue(cookieValue, CUSTOMER_SECRET);
  if (!userId) {
    console.log("userId is null from verifySignedValue");
    return null;
  }
  console.log(
    "userId is not null from verifySignedValue and querying currentUser and going out of getCurrentUser",
  );
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
  console.log("in getCurrentUserId and get cookieValue");
  if (!cookieValue) {
    console.log("in getCurrentUserId and cookieValue is null");
    return null;
  }
  console.log(
    "going in verifySignedValue and return value from verifySignedValue and going out of getCurrentUserId",
  );
  return verifySignedValue(cookieValue, CUSTOMER_SECRET);
}
export async function getOrCreateCustomerId() {
  console.log("in getOrCreateCustomerId and going to getCurrentUserId");
  const existingUserId = await getCurrentUserId();
  if (existingUserId) {
    console.log("getCurrentUserId returned null");
    return existingUserId;
  }
  console.log("getCurrentUserId returned userId");
  const guestUser = await prisma.user.create({
    data: {
      isGuest: true,
    },
    select: {
      id: true,
    },
  });
  console.log("retrieved guestUser and going to createCustomerSession");
  await createCustomerSession(guestUser.id);
  console.log("out of createCustomerSession and returning guestUserId");
  return guestUser.id;
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
  return guestUser;
}
export async function destroyCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_COOKIE);
}
