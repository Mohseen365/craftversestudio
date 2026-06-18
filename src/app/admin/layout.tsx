// import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAdminAuthenticated();
  // Login page is under /admin/login — allow without auth
  // We check pathname via a wrapper pattern: login page won't use this layout's redirect
  // Actually login is separate - let children handle. Use a client check...
  // Simpler: only redirect if not authed and not on login - login has its own layout override

  return (
    <div className="min-h-screen bg-stone-50">
      {authed && (
        <div className="border-b border-stone-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-4">
            <p className="text-sm font-semibold text-stone-900">
              Admin Dashboard
            </p>
            <AdminNav />
          </div>
        </div>
      )}
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
