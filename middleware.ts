import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLocale, LOCALE_HEADER, LOCALE_PARAM } from "@/lib/locale";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("session");
  const { pathname } = request.nextUrl;

  const isProtectedPath = pathname.startsWith("/trips") || pathname.startsWith("/plan");
  const isAuthPath = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/forgot-password");

  if (isProtectedPath && !session) {
    // The login page gets the address the visitor was heading to, so it can send them on afterwards.
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath && session) {
    return NextResponse.redirect(new URL("/trips", request.url));
  }

  // An address like /about?lang=en names its language. Passing it on lets the page be rendered in it.
  const named = request.nextUrl.searchParams.get(LOCALE_PARAM);
  if (!isLocale(named)) return NextResponse.next();
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, named);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - images/ (public images)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|images/).*)",
  ],
};
