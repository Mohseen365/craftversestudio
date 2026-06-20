import { LoginForm } from "./LoginForm";
import { trackEvent } from "@/lib/eventLogger";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    orderId?: string;
    orderNumber?: string;
    productId?: string;
    // userId?: string;
  }>;
}) {
  const params = await searchParams;
  const orderId = params.orderId ?? "";
  const orderNumber = params.orderNumber ?? "";
  const productId = params.productId ?? "";
  // const userId = params.userId ?? "";
  const userId = await getCurrentUserId();
  let productName = "";
  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true },
    });
    productName = product?.name ?? "";
  }

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
        {productName
          ? `Complete your order for ${productName}`
          : "We need your contact details to proceed with your order"}
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
          productId: productId,
          userId: userId,
        }}
      />
    </main>
  );
}
