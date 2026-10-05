import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("session");
  const { pathname } = request.nextUrl;

  // Protect all routes inside /trips or /plan (add more as needed)
  const isProtectedPath = pathname.startsWith("/trips") || pathname.startsWith("/plan");
  const isAuthPath = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/forgot-password");

  if (isProtectedPath && !session) {
    // Redirect to login if accessing protected route without session cookie
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath && session) {
    // Redirect to app if already logged in and trying to access auth pages
    return NextResponse.redirect(new URL("/trips", request.url));
  }

  return NextResponse.next();
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
