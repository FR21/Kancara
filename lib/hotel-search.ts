import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const BOOKING_HOST = process.env.RAPIDAPI_BOOKING_HOST || "booking-com18.p.rapidapi.com";

// Hotel prices move within a month; attraction listings rarely change, so they are kept for half a year.
const HOTEL_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;
const STABLE_CACHE_TTL_SECONDS = 180 * 24 * 60 * 60;

export type HotelDeal = {
  name: string;
  priceFormatted?: string;
  priceNumber?: number;
  currency?: string;
  rating?: number;
  address?: string;
  imageUrl?: string;
  url?: string;
};

export type AttractionDeal = {
  name: string;
  category?: string;
  priceFormatted?: string;
  rating?: number;
  address?: string;
  imageUrl?: string;
  description?: string;
};

// The parts of Booking's answer that are read here. The service sends far more.
type BookingStay = {
  name: string;
  priceBreakdown?: { grossPrice?: { value?: number; currency?: string } };
  reviewScore?: number;
  wishlistName?: string;
  photoUrls?: string[];
};

function normalizeKey(str: string): string {
  return str.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** Keeps an outside answer in the database, so the same destination does not spend the API quota again. */
async function getCachedOrFetch<T>(
  cacheKey: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const cached = await prisma.apiCache.findUnique({
      where: { cacheKey },
    });

    if (cached && cached.expiresAt > new Date()) {
      return cached.payload as T;
    }
  } catch (err) {
    console.warn("ApiCache lookup failed, proceeding to live fetch:", err);
  }

  const liveData = await fetcher();

  // An empty answer is not kept, so a lookup that found nothing is tried again next time.
  if (Array.isArray(liveData) && liveData.length > 0) {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      const payload = liveData as unknown as Prisma.InputJsonValue;
      await prisma.apiCache.upsert({
        where: { cacheKey },
        update: { payload, expiresAt },
        create: { cacheKey, payload, expiresAt },
      });
    } catch (saveErr) {
      console.warn("Gagal menyimpan ke ApiCache Neon:", saveErr);
    }
  }

  return liveData;
}

/** Hotel suggestions with live prices from Booking.com through RapidAPI, kept for 30 days. */
export async function searchBookingHotels(
  destination: string,
  checkinDate?: string,
  checkoutDate?: string,
  adults: number = 2,
  subZone?: string,
  budgetTier?: "budget" | "moderate" | "luxury"
): Promise<HotelDeal[]> {
  if (!RAPIDAPI_KEY) return [];

  const searchQuery = [subZone, destination].filter(Boolean).join(" ");
  const cacheKey = `booking:stays:${normalizeKey(destination)}:${normalizeKey(subZone || "all")}:${budgetTier || "all"}`;

  return getCachedOrFetch(cacheKey, HOTEL_CACHE_TTL_SECONDS, async () => {
    try {
      // The search takes a location id, so the area's name is first resolved through auto-complete.
      const autoUrl = `https://${BOOKING_HOST}/stays/auto-complete?query=${encodeURIComponent(searchQuery)}`;
      const autoRes = await fetch(autoUrl, {
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": BOOKING_HOST,
        },
      });

      if (!autoRes.ok) return [];
      const autoJson = await autoRes.json();
      const locId = autoJson?.data?.[0]?.id;
      if (!locId) return [];

      // Without dates the prices are asked for a two-night stay a month from now.
      const now = new Date();
      const defaultCheckin = checkinDate || new Date(now.getTime() + 86400000 * 30).toISOString().slice(0, 10);
      const defaultCheckout = checkoutDate || new Date(now.getTime() + 86400000 * 32).toISOString().slice(0, 10);

      const searchUrl = `https://${BOOKING_HOST}/stays/search?locationId=${encodeURIComponent(locId)}&checkinDate=${defaultCheckin}&checkoutDate=${defaultCheckout}&adults=${adults}`;
      const searchRes = await fetch(searchUrl, {
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": BOOKING_HOST,
        },
      });

      if (!searchRes.ok) return [];
      const searchJson = await searchRes.json();
      let stays: BookingStay[] = searchJson?.data || [];

      if (budgetTier === "budget") {
        stays = [...stays].sort((a, b) => {
          const pa = a.priceBreakdown?.grossPrice?.value || 9999999;
          const pb = b.priceBreakdown?.grossPrice?.value || 9999999;
          return pa - pb;
        });
      } else if (budgetTier === "luxury") {
        stays = [...stays].sort((a, b) => {
          const pa = a.priceBreakdown?.grossPrice?.value || 0;
          const pb = b.priceBreakdown?.grossPrice?.value || 0;
          return pb - pa;
        });
      }

      return stays.slice(0, 5).map((h): HotelDeal => {
        const grossPrice = h.priceBreakdown?.grossPrice?.value;
        const currency = h.priceBreakdown?.grossPrice?.currency || "IDR";
        const formatted = grossPrice
          ? `Rp ${Math.round(grossPrice).toLocaleString("id-ID")}/mlm`
          : undefined;

        return {
          name: h.name,
          priceFormatted: formatted,
          priceNumber: grossPrice,
          currency,
          rating: h.reviewScore ? Number((h.reviewScore / 2).toFixed(1)) : undefined,
          address: h.wishlistName || [subZone, destination].filter(Boolean).join(", "),
          imageUrl: h.photoUrls?.[0],
        };
      });
    } catch (error) {
      console.warn("RapidAPI Booking.com fetch failed:", error);
      return [];
    }
  });
}

/** The attractions kept in the database for a destination. Nothing fetches them live. */
export async function getCachedAmusementAndAttractions(
  destination: string,
  subZone?: string
): Promise<AttractionDeal[]> {
  const cacheKey = `attractions:${normalizeKey(destination)}:${normalizeKey(subZone || "all")}`;

  return getCachedOrFetch(cacheKey, STABLE_CACHE_TTL_SECONDS, async () => {
    // Return empty by default if not pre-seeded; will fall back to agent & verified catalogue
    return [];
  });
}
