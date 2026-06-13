import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TrackForm } from "./TrackForm";
import { trackEvent } from "@/lib/eventLogger";
import { getCurrentUser } from "@/lib/auth";
// import { getOrCreateCustomer } from "@/lib/auth";

// const user = await getCurrentUser();
export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string }>;
}) {
  const params = await searchParams;

  getCurrentUser()
    .then((user) => trackEvent({ userId: user?.id, eventType: "TRACK_ORDER" }))
    .catch((err) => console.error("Customer creation failed:", err));

  return (
    <>
      <Header />
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="font-serif text-3xl text-stone-900">Track your order</h1>
        <p className="mt-2 text-stone-500">
          Enter your order number or Mobile number to see status updates
        </p>
        <div className="mt-8">
          <TrackForm initialOrderNumber={params.orderNumber} />
        </div>
      </main>
      <Footer />
    </>
  );
}
