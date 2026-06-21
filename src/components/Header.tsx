import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-rose-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🌸</span>
          <span className="font-serif text-xl font-semibold text-rose-900">
            Bouquet Studio
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-stone-600">
          <Link href="/login" className="hover:text-rose-700 transition-colors">
            Login
          </Link>
          <Link
            href="/catalog"
            className="hover:text-rose-700 transition-colors"
          >
            Catalog
          </Link>
          <Link href="/track" className="hover:text-rose-700 transition-colors">
            Track Order
          </Link>
        </nav>
      </div>
    </header>
  );
}
