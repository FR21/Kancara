import { type NextRequest, NextResponse } from "next/server";
import { postLoginPath, SESSION_COOKIE } from "@/lib/auth/routes";
import { verifySession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Where a signed-in page sends a visitor it cannot recognise. A session cookie that no longer works (the account
 * was removed, or its sessions were revoked) is cleared here before the login page is shown. Without that the
 * login page, seeing a cookie, would send them back to the page that just turned them away, for ever.
 * A session that does work is left alone and the visitor goes on to where they were heading.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "session-ended");
  if (limited) return limited;

  const returnTo = postLoginPath(request.nextUrl.search);
  if (await verifySession()) return NextResponse.redirect(new URL(returnTo, request.url));

  const login = new URL("/login", request.url);
  login.searchParams.set("redirect", returnTo);
  const response = NextResponse.redirect(login);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
