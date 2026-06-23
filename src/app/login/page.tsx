import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-3xl font-semibold">Sign in to continue</h1>

      <p className="mt-2 text-stone-600">
        We use Google Sign-In to identify customers for booking and tracking
        orders.
      </p>

      <LoginForm />
    </main>
  );
}
