import { type NextRequest, NextResponse } from "next/server";
import { isPlacePhotoName } from "@/lib/place-category";
import { rateLimit } from "@/lib/rate-limit";

const KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";
const TIMEOUT_MS = 8000;
// A day shows several stops at once, each with its photo; the browser keeps them after the first load.
const PHOTOS_PER_SECOND = 12;
const KEEP_SECONDS = 86_400;

/**
 * A Places photo for an itinerary stop, fetched with the server's key so the key never reaches the browser:
 * `?name=places/<place>/photos/<photo>`. Answers 404 when there is no key or no photo.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "place-photo", PHOTOS_PER_SECOND);
  if (limited) return limited;

  const name = request.nextUrl.searchParams.get("name") ?? "";
  if (!isPlacePhotoName(name)) return NextResponse.json({ error: "Invalid photo" }, { status: 400 });
  if (!KEY) return NextResponse.json({ error: "Photos unavailable" }, { status: 404 });

  const upstream = await fetch(
    `https://places.googleapis.com/v1/${name}/media?maxHeightPx=400&maxWidthPx=400&key=${encodeURIComponent(KEY)}`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  ).catch(() => null);
  const type = upstream?.headers.get("content-type") ?? "";
  if (!upstream?.ok || !upstream.body || !type.startsWith("image/")) {
    return NextResponse.json({ error: "Photo unavailable" }, { status: 404 });
  }
  return new NextResponse(upstream.body, {
    headers: { "Content-Type": type, "Cache-Control": `private, max-age=${KEEP_SECONDS}` },
  });
}
