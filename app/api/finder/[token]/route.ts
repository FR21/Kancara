import { type NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getFinderView, reportFromFinder } from "@/lib/safety/store";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

// A meeting card's code is scanned by a stranger, so neither of these asks for a sign-in. The token in the
// address is what proves the card is real, and the answer holds as little as lets the stranger help.

export async function GET(request: NextRequest, context: RouteContext<"/api/finder/[token]">) {
  const limited = rateLimit(request, "finder-read");
  if (limited) return limited;

  // The plan is read against the clock of the phone that scanned the card, which is where the member is.
  const params = request.nextUrl.searchParams;
  const date = params.get("date") ?? "";
  const time = params.get("time") ?? "";
  if (!DATE.test(date) || !TIME.test(time)) return NextResponse.json({ error: "Invalid time" }, { status: 400 });

  const { token } = await context.params;
  const view = await getFinderView(token, { date, time });
  if (view === null) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  if (view === "expired") return NextResponse.json({ error: "Card expired" }, { status: 410 });
  return NextResponse.json(view);
}

/** "I am with them", with the stranger's location when they chose to send it: `{ latitude?, longitude? }`. */
export async function POST(request: NextRequest, context: RouteContext<"/api/finder/[token]">) {
  const limited = rateLimit(request, "finder-write");
  if (limited) return limited;

  const body: unknown = await request.json().catch(() => null);
  const { latitude, longitude } = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const placed =
    typeof latitude === "number" && typeof longitude === "number" && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;

  const { token } = await context.params;
  const result = await reportFromFinder(token, placed ? { latitude, longitude } : null);
  if (result === "notFound") return NextResponse.json({ error: "Card not found" }, { status: 404 });
  if (result === "expired") return NextResponse.json({ error: "Card expired" }, { status: 410 });
  return NextResponse.json({ told: true });
}
