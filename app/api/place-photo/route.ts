import { type NextRequest, NextResponse } from "next/server";
import { isPlacePhotoName } from "@/lib/place-category";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";
const TIMEOUT_MS = 8000;
const PHOTOS_PER_SECOND = 12;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const ONE_YEAR_S = 365 * 24 * 60 * 60;

/**
 * A Places photo for an itinerary stop, persisted in Neon DB (`api_caches` table):
 * - If already in Neon DB: served directly from DB (0 external API calls).
 * - If not yet in Neon DB: fetched once from Google Places API, stored into Neon DB, and returned.
 * Answers 404 when there is no key or no photo.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "place-photo", PHOTOS_PER_SECOND);
  if (limited) return limited;

  const name = request.nextUrl.searchParams.get("name") ?? "";
  if (!isPlacePhotoName(name)) return NextResponse.json({ error: "Invalid photo" }, { status: 400 });

  const cacheKey = `place-photo:${name}`;

  // 1. Check Neon DB first (Zero Google API calls on subsequent loads or refreshes)
  try {
    const cached = await prisma.apiCache.findUnique({
      where: { cacheKey },
    });
    if (cached && cached.expiresAt > new Date()) {
      const payload = cached.payload as { contentType?: string; base64?: string } | null;
      if (payload?.base64 && payload?.contentType) {
        const imageBuffer = Buffer.from(payload.base64, "base64");
        return new NextResponse(imageBuffer, {
          headers: {
            "Content-Type": payload.contentType,
            "Cache-Control": `public, max-age=${ONE_YEAR_S}, immutable`,
            "X-Cache": "HIT-NEON-DB",
          },
        });
      }
    }
  } catch (err) {
    console.warn("Neon DB photo cache read failed, falling back to live fetch:", err);
  }

  // 2. Fetch from Google Places API once
  if (!KEY) return NextResponse.json({ error: "Photos unavailable" }, { status: 404 });

  const upstream = await fetch(
    `https://places.googleapis.com/v1/${name}/media?maxHeightPx=400&maxWidthPx=400&key=${encodeURIComponent(KEY)}`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  ).catch(() => null);

  const type = upstream?.headers.get("content-type") ?? "";
  if (!upstream?.ok || !type.startsWith("image/")) {
    return NextResponse.json({ error: "Photo unavailable" }, { status: 404 });
  }

  const arrayBuffer = await upstream.arrayBuffer().catch(() => null);
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    return NextResponse.json({ error: "Empty photo" }, { status: 404 });
  }

  const imageBuffer = Buffer.from(arrayBuffer);
  const base64 = imageBuffer.toString("base64");

  // 3. Persist to Neon DB asynchronously so subsequent loads never hit Google Maps again
  const expiresAt = new Date(Date.now() + ONE_YEAR_MS);
  prisma.apiCache
    .upsert({
      where: { cacheKey },
      update: { payload: { contentType: type, base64 }, expiresAt },
      create: { cacheKey, payload: { contentType: type, base64 }, expiresAt },
    })
    .catch((saveErr) => {
      console.warn("Failed saving photo to Neon DB:", saveErr);
    });

  return new NextResponse(imageBuffer, {
    headers: {
      "Content-Type": type,
      "Cache-Control": `public, max-age=${ONE_YEAR_S}, immutable`,
      "X-Cache": "MISS-STORED-TO-NEON-DB",
    },
  });
}

