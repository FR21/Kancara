import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const BOOKING_HOST = process.env.RAPIDAPI_BOOKING_HOST || "booking-com18.p.rapidapi.com";
const TRIPADVISOR_HOST = process.env.RAPIDAPI_TRIPADVISOR_HOST || "tripadvisor-com1.p.rapidapi.com";

// Cache TTL dalam detik:
// - Hotel: 30 hari (1 bulan) - harga akomodasi bulanan
// - Restoran & Amusement: 180 hari (6 bulan) - harga menu & tiket atraksi sangat stabil
export const HOTEL_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;
export const STABLE_CACHE_TTL_SECONDS = 180 * 24 * 60 * 60; // 6 bulan

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

export type RestaurantDeal = {
  name: string;
  priceRange?: string;
  rating?: number;
  cuisine?: string[];
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

// The parts of each outside answer that are read here. Both services send far more.
type BookingStay = {
  name: string;
  priceBreakdown?: { grossPrice?: { value?: number; currency?: string } };
  reviewScore?: number;
  wishlistName?: string;
  photoUrls?: string[];
};

type TripAdvisorPlace = {
  name: string;
  title: string;
  priceTag?: string;
  price_level?: string;
  rating?: number | string;
  averageRating?: number | string;
  establishmentTypeAndCuisineTags?: string[];
  address?: string;
  heroImgUrl?: string;
  image?: string;
};

function normalizeKey(str: string): string {
  return str.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/**
 * Helper Caching ke Neon Database (Prisma)
 * Memastikan kuota API eksternal tidak terkuras berulang kali untuk destinasi yang sama!
 */
export async function getCachedOrFetch<T>(
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

  // Jika tidak ada di cache, panggil live API
  const liveData = await fetcher();

  // Simpan ke database Neon jika datanya valid dan tidak kosong
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

/**
 * Mencari rekomendasi hotel dan harga live dari Booking.com (booking-com18) via RapidAPI
 * Dilengkapi Database Caching 30 hari (1 bulan) di Neon!
 */
export async function searchBookingHotels(
  destination: string,
  checkinDate?: string,
  checkoutDate?: string,
  adults: number = 2,
  subZone?: string,
  budgetTier?: "budget" | "moderate" | "luxury"
): Promise<HotelDeal[]> {
  if (!RAPIDAPI_KEY) return [];

  // Gabungkan query pencarian: misal "Pantai Indah Kapuk Jakarta" atau "Ubud Bali"
  const searchQuery = [subZone, destination].filter(Boolean).join(" ");
  const cacheKey = `booking:stays:${normalizeKey(destination)}:${normalizeKey(subZone || "all")}:${budgetTier || "all"}`;

  return getCachedOrFetch(cacheKey, HOTEL_CACHE_TTL_SECONDS, async () => {
    try {
      // 1. Dapatkan locationId dari nama zona/destinasi (/stays/auto-complete)
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

      // Tanggal default (30 hari ke depan) jika tidak tersedia
      const now = new Date();
      const defaultCheckin = checkinDate || new Date(now.getTime() + 86400000 * 30).toISOString().slice(0, 10);
      const defaultCheckout = checkoutDate || new Date(now.getTime() + 86400000 * 32).toISOString().slice(0, 10);

      // 2. Cari stays & harga berdasarkan locationId base64 (/stays/search)
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

      // Sort / filter sesuai budgetTier jika ada
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

/**
 * Mencari restoran dan rating/range harga dari TripAdvisor (tripadvisor-com1) via RapidAPI
 * Dilengkapi Database Caching 180 hari (6 bulan) di Neon!
 */
export async function searchTripAdvisorRestaurants(
  query: string,
  destination: string = "Jakarta"
): Promise<RestaurantDeal[]> {
  if (!RAPIDAPI_KEY) return [];

  const cacheKey = `tripadvisor:restaurants:${normalizeKey(destination)}:${normalizeKey(query)}`;

  return getCachedOrFetch(cacheKey, STABLE_CACHE_TTL_SECONDS, async () => {
    try {
      // 1. Dapatkan geoId dari nama kota via /auto-complete
      const autoUrl = `https://${TRIPADVISOR_HOST}/auto-complete?query=${encodeURIComponent(destination)}`;
      const autoRes = await fetch(autoUrl, {
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": TRIPADVISOR_HOST,
        },
      });

      if (!autoRes.ok) return [];
      const autoJson = await autoRes.json();
      const geoId = autoJson?.data?.[0]?.detailsV2?.locationId || autoJson?.data?.[0]?.geoId;
      if (!geoId) return [];

      // 2. Cari restoran di kota tersebut dengan kata kunci (/restaurants/search)
      const searchUrl = `https://${TRIPADVISOR_HOST}/restaurants/search?geoId=${geoId}&query=${encodeURIComponent(query)}`;
      const searchRes = await fetch(searchUrl, {
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": TRIPADVISOR_HOST,
        },
      });

      if (!searchRes.ok) return [];
      const searchJson = await searchRes.json();
      const rawList = searchJson?.data?.data || searchJson?.data || [];

      if (!Array.isArray(rawList)) return [];

      return rawList.slice(0, 5).map((r: TripAdvisorPlace): RestaurantDeal => {
        return {
          name: r.name || r.title,
          priceRange: r.priceTag || r.price_level || undefined,
          rating: r.rating || r.averageRating ? Number(r.rating || r.averageRating) : undefined,
          cuisine: Array.isArray(r.establishmentTypeAndCuisineTags) ? r.establishmentTypeAndCuisineTags : [],
          address: r.address || destination,
          imageUrl: r.heroImgUrl || r.image,
        };
      });
    } catch (error) {
      console.warn("RapidAPI TripAdvisor fetch failed:", error);
      return [];
    }
  });
}

/**
 * Mendapatkan rekomendasi tempat hiburan / amusement / atraksi terverifikasi
 * dengan Database Caching 180 hari (6 bulan) di Neon!
 */
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
