"use client";

export default function OrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h2 className="text-xl font-semibold text-red-700">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-stone-600">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-stone-900 px-4 py-2 text-sm text-white"
      >
        Try again
      </button>
    </div>
  );
}
