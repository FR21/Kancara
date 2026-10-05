const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
