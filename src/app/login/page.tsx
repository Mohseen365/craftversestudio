import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: {
    orderId?: string;
    orderNumber?: string;
    slug: string;
  };
}) {
  const orderId = searchParams?.orderId ?? "";
  const orderNumber = searchParams?.orderNumber ?? "";
  const slug = searchParams?.slug ?? "";
  console.log("in login page");

  // void trackEvent({
  //   userId: userId,
  //   eventType: "LOGIN",
  //   metadata: {
  //     orderId: orderId,
  //     totalAmount: orderNumber,
  //   },
  // });

  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-3xl font-semibold">
        We need your contact details to proceed with your order
      </h1>
      <p className="mt-2 text-stone-600">
        First we will check that we can provide you bouquet on required date
        then we will confirm your order and send you payment information
      </p>
      <p className="mt-2 text-stone-600">
        Entering Full Name and Mobile Number is must Entering Email, Instagram
        Username is optional
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
