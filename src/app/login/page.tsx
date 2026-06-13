import { LoginForm } from "./LoginForm";
import { getCurrentUser } from "@/lib/auth";
import { trackEvent } from "@/lib/eventLogger";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    orderId?: string;
    orderNumber?: string;
    slug?: string;
  }>;
}) {
  const params = await searchParams;
  const orderId = params.orderId ?? "";
  const orderNumber = params.orderNumber ?? "";
  const slug = params.slug ?? "";
  getCurrentUser()
    .then((user) =>
      trackEvent({
        userId: user?.id,
        eventType: "LOGIN",
        metadata: {
          orderId: orderId,
          totalAmount: orderNumber,
        },
      })
    )
    .catch((err) => console.error("Customer creation failed:", err));

  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-3xl font-semibold">
        We need your contact details in order to reach out to you regarding your
        order
      </h1>
      <p className="mt-2 text-stone-600">
        First we will check that we can provide you bouquet on required date
        then we will confirm your order and send you payment information
      </p>
      <p className="mt-2 text-stone-600">
        Enter any one contact detail from Mobile Number, Email, Instagram
        Username
      </p>

      <LoginForm
        order={{
          id: orderId,
          number: orderNumber,
          slug: slug,
        }}
      />
    </main>
  );
}
