export default function OrdersLoading() {
  return (
    <div className="animate-pulse space-y-4 p-8">
      <div className="h-8 w-48 rounded bg-stone-200" />
      <div className="flex gap-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 w-32 rounded-lg bg-stone-200" />
        ))}
      </div>
      <div className="space-y-4 mt-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-stone-100" />
        ))}
      </div>
    </div>
  );
}
