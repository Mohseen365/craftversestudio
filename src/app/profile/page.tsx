import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./ProfileForm";
import {
  getRedirectDestination,
  clearRedirectDestination,
} from "@/lib/redirect-cookie";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      name: true,
      email: true,
      mobileNo: true,
      instagramUsername: true,
    },
  });
  if (user?.mobileNo) {
    const destination = (await getRedirectDestination()) ?? "/catalog";
    await clearRedirectDestination();
    redirect(destination);
  }
  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-3xl font-semibold">Complete Your Profile</h1>

      <p className="mt-2 text-stone-600">
        We need your mobile number so we can contact you regarding your orders.
      </p>

      <ProfileForm
        user={{
          name: user?.name ?? "",
          email: user?.email ?? "",
          mobileNo: user?.mobileNo ?? "",
          instagramUsername: user?.instagramUsername ?? "",
        }}
      />
    </main>
  );
}
