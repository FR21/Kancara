import { type NextRequest, NextResponse } from "next/server";
import { isLocale } from "@/lib/locale";
import { findPlace } from "@/lib/place-finder";
import { rateLimit } from "@/lib/rate-limit";

const MAX_NAMES = 8;
const MAX_NAME_CHARS = 80;

/**
 * Where a trip's cities are, in the order given, for the sketch of its route:
 * `?name=Jakarta&name=Madrid&name=Tokyo&lang=id`. A city that cannot be found answers null in its place.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "place-points");
  if (limited) return limited;

  const params = request.nextUrl.searchParams;
  const names = params.getAll("name").map((name) => name.trim()).slice(0, MAX_NAMES);
  if (names.length === 0 || names.some((name) => name === "" || name.length > MAX_NAME_CHARS)) {
    return NextResponse.json({ error: "Invalid names" }, { status: 400 });
  }
  const language = params.get("lang");
  const locale = isLocale(language) ? language : "id";
  const points = await Promise.all(names.map((name) => findPlace(name, locale).catch(() => null)));
  return NextResponse.json({ points }, { headers: { "Cache-Control": "private, max-age=86400" } });
}
