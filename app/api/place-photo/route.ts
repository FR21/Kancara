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

  let name = request.nextUrl.searchParams.get("name") ?? "";
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";

  // If query is provided instead of direct photo name (e.g. backup places or missing photo metadata),
  // resolve photo name via Neon DB cache or Google Places Text Search.
  if (!name && query) {
    const queryCacheKey = `place-photo-query:${query.toLowerCase()}`;
    try {
      const cachedQuery = await prisma.apiCache.findUnique({
        where: { cacheKey: queryCacheKey },
      });
      if (cachedQuery && cachedQuery.expiresAt > new Date()) {
        const payload = cachedQuery.payload as { photoName?: string } | null;
        if (payload?.photoName && isPlacePhotoName(payload.photoName)) {
          name = payload.photoName;
        }
      }
    } catch (err) {
      console.warn("Neon DB photo query cache lookup failed:", err);
    }

    if (!name) {
      try {
        const stopWords = new Set([
          "the", "and", "of", "in", "at", "to", "for", "a", "an", "on", "di", "ke",
          "dari", "yang", "dan", "national", "museum", "science", "innovation", "park",
          "hotel", "restaurant", "cafe", "center", "centre"
        ]);
        const words = query
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 3 && !stopWords.has(w));

        if (words.length > 0) {
          const trips = await prisma.trip.findMany({
            take: 20,
            orderBy: { updatedAt: "desc" },
          });

          for (const trip of trips) {
            const itinerary = trip.itinerary as { days?: { items?: { title?: string; imageUrl?: string }[] }[] } | null;
            if (!itinerary?.days) continue;
            for (const day of itinerary.days) {
              if (!day.items) continue;
              for (const item of day.items) {
                if (item.imageUrl && item.title) {
                  const itemLower = item.title.toLowerCase();
                  if (words.some((w) => itemLower.includes(w))) {
                    const match = item.imageUrl.match(/name=([^&]+)/);
                    if (match) {
                      const decoded = decodeURIComponent(match[1]);
                      if (isPlacePhotoName(decoded)) {
                        name = decoded;
                        break;
                      }
                    }
                  }
                }
              }
              if (name) break;
            }
            if (name) break;
          }
        }
      } catch (err) {
        console.warn("Matching photo from trips failed:", err);
      }
    }

    if (!name && KEY) {
      try {
        const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": KEY,
            "X-Goog-FieldMask": "places.photos",
          },
          body: JSON.stringify({ textQuery: query }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (searchRes.ok) {
          const data = await searchRes.json();
          const firstPhoto = data.places?.[0]?.photos?.[0]?.name;
          if (firstPhoto && isPlacePhotoName(firstPhoto)) {
            name = firstPhoto;
          }
        }
      } catch (err) {
        console.warn("Places searchText photo lookup failed:", err);
      }
    }

    if (name && isPlacePhotoName(name)) {
      const expiresAt = new Date(Date.now() + ONE_YEAR_MS);
      prisma.apiCache
        .upsert({
          where: { cacheKey: queryCacheKey },
          update: { payload: { photoName: name }, expiresAt },
          create: { cacheKey: queryCacheKey, payload: { photoName: name }, expiresAt },
        })
        .catch((saveErr) => console.warn("Failed saving photo query cache to Neon DB:", saveErr));
    }
  }

  if (!isPlacePhotoName(name)) return NextResponse.json({ error: "Invalid photo" }, { status: 404 });

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

