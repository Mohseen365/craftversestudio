import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "bouquet_admin_session";
const SESSION_VALUE = "authenticated";

/**
 * Protect all /admin pages and /api/admin routes.
 * - Admin pages redirect to /admin/login when unauthenticated.
 * - Admin API routes return 401 JSON when unauthenticated.
 * - The login page and login API are always public.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow the login page and login API through
  if (
    pathname === "/admin/login" ||
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/logout"
  ) {
    return NextResponse.next();
  }

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (isAdminPage || isAdminApi) {
    const session = req.cookies.get(ADMIN_COOKIE)?.value;

    if (session !== SESSION_VALUE) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
