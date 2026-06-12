import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-3xl font-semibold">Welcome to Bouquet</h1>

      <p className="mt-2 text-stone-600">Sign in or continue as guest.</p>

      <LoginForm />
    </main>
  );
}
