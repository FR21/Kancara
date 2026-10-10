const HOME = "/trips";

export const SESSION_COOKIE = "session";
const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

/**
 * Where a signed-in page sends a visitor it cannot recognise, instead of straight to the login page. That
 * address clears a session cookie that no longer works; see app/api/auth/session-ended.
 */
export function sessionEndedPath(returnTo: string): string {
  return `/api/auth/session-ended?redirect=${encodeURIComponent(returnTo)}`;
}

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Where to go after signing in: the path in ?redirect= when it points inside
 * the app, otherwise home. Anything that could leave the site is ignored.
 */
export function postLoginPath(search: string): string {
  const target = new URLSearchParams(search).get("redirect");
  if (!target || !target.startsWith("/") || target.startsWith("//") || target.includes("\\")) return HOME;
  return isAuthRoute(target.split("?")[0]) ? HOME : target;
}
