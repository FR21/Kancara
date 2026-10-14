import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { generateFieldPass, readFieldPass } from "@/lib/field-pass/store";
import { isLocale } from "@/lib/locale";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

const NOT_FOUND = "This trip was not found";

/**
 * The group's field pass in one language, `?locale=id|en`: `{ pass, generatedAt }`, or `{ pass: null }` before
 * anyone has had it written. Being a GET, the service worker keeps the answer for reading without a connection.
 */
export async function GET(request: NextRequest, context: RouteContext<"/api/field-pass/[tripId]">) {
  const limited = rateLimit(request, "field-pass-read");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const locale = request.nextUrl.searchParams.get("locale");
  if (!isLocale(locale)) return NextResponse.json({ error: "Unknown locale" }, { status: 400 });

  const { tripId } = await context.params;
  const shared = await readFieldPass(viewer, tripId, locale);
  if (shared === "notFound") return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  return NextResponse.json(shared ?? { pass: null });
}

/**
 * Has the pass written when there is none yet, `{ locale }`, or written again, `{ locale, rewrite: true }`.
 * Answers with the pass the group now shares.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/field-pass/[tripId]">) {
  const limited = rateLimit(request, "field-pass-write");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || !("locale" in body) || !isLocale(body.locale)) {
    return NextResponse.json({ error: "Unknown locale" }, { status: 400 });
  }
  const rewrite = "rewrite" in body && body.rewrite === true;

  const { tripId } = await context.params;
  try {
    const result = await generateFieldPass(viewer, tripId, body.locale, rewrite);
    if (result === "notFound") return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    if (result === "noDestination") return NextResponse.json({ error: "The trip has no destination yet" }, { status: 422 });
    if (result === "tooSoon") return NextResponse.json({ error: "The pass was written moments ago" }, { status: 409 });
    return NextResponse.json(result);
  } catch (caught) {
    console.error("Field pass could not be written", { tripId, error: caught instanceof Error ? caught.message : caught });
    return NextResponse.json({ error: "The field pass could not be written. Try again." }, { status: 502 });
  }
}
