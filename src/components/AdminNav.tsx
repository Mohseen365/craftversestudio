import Link from "next/link";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/capacity", label: "Capacity" },
];

export function AdminNav() {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-stone-200 pb-4">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
        >
          {link.label}
        </Link>
      ))}
      <form action="/api/admin/logout" method="POST" className="ml-auto">
        <button
          type="submit"
          className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Log out
        </button>
      </form>
    </nav>
  );
}
