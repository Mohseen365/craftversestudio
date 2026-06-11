import { Resend } from "resend";
import { formatDate } from "./utils";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const adminEmail = process.env.ADMIN_EMAIL;
const fromEmail = process.env.FROM_EMAIL ?? "Bouquet Orders <onboarding@resend.dev>";

const appUrl =  process.env.URL ||  process.env.DEPLOY_PRIME_URL;


async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend || !to) {
    console.log(`[email skipped] ${subject} → ${to}`);
    return;
  }
  await resend.emails.send({ from: fromEmail, to, subject, html });
}

export async function notifyAdminNewOrder(orderNumber: string, customerName: string) {
  if (!adminEmail) return;
  await sendEmail({
    to: adminEmail,
    subject: `New Order #${orderNumber}`,
    html: `<p>New order from <strong>${customerName}</strong>.</p>
      <p><a href="${appUrl}/admin/orders">View in admin</a></p>`,
  });
}

export async function notifyAdminPaymentPending(orderNumber: string) {
  if (!adminEmail) return;
  await sendEmail({
    to: adminEmail,
    subject: `Payment Awaiting Verification — #${orderNumber}`,
    html: `<p>Payment screenshot uploaded for order <strong>#${orderNumber}</strong>.</p>
      <p><a href="${appUrl}/admin/orders">Verify payment</a></p>`,
  });
}

export async function notifyCustomerOrderConfirmed(
  email: string,
  orderNumber: string,
  deliveryDate: Date,
) {
  await sendEmail({
    to: email,
    subject: `Order Confirmed — #${orderNumber}`,
    html: `<p>Your bouquet order <strong>#${orderNumber}</strong> is confirmed.</p>
      <p>Estimated delivery: <strong>${formatDate(deliveryDate)}</strong></p>
      <p><a href="${appUrl}/track">Track your order</a></p>`,
  });
}

export async function notifyCustomerStatusUpdate(
  email: string,
  orderNumber: string,
  statusLabel: string,
) {
  await sendEmail({
    to: email,
    subject: `Order Update — #${orderNumber}`,
    html: `<p>Your bouquet order <strong>#${orderNumber}</strong> is now:</p>
      <p><strong>${statusLabel}</strong></p>
      <p><a href="${appUrl}/track">Track your order</a></p>`,
  });
}
