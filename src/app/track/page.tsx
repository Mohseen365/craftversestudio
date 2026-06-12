import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TrackForm } from "./TrackForm";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }
  const params = await searchParams;

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
