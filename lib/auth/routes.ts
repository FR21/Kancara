const HOME = "/trips";
const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

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
