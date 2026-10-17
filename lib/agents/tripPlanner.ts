/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenAI } from '@google/genai';
import { BACKUP_KINDS } from '@/lib/client/captain';
import { mediationBrief } from './mediationBrief';
import { categoryFromTypes, inferCategoryFromTitle, isPlacePhotoName, placePhotoUrl } from '@/lib/place-category';
import { 
  searchBookingHotels, 
  getCachedAmusementAndAttractions, 
  type HotelDeal, 
  type AttractionDeal 
} from '@/lib/hotel-search';

import { prisma } from '@/lib/prisma';

const client = new GoogleGenAI({});

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const MAX_BACKUPS_PER_STOP = 2;
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

export async function executeSearchPlaces(query: string, locale: string = "id") {
  if (!GOOGLE_MAPS_API_KEY) return [];
  const normalized = query.toLowerCase().trim();
  const cacheKey = `place-search:${locale}:${normalized}`;

  // 1. Check Neon DB first to prevent redundant Google Maps searches
  try {
    const cached = await prisma.apiCache.findUnique({ where: { cacheKey } });
    if (cached && cached.expiresAt > new Date() && Array.isArray(cached.payload)) {
      return cached.payload as any[];
    }
  } catch (err) {
    console.warn("Neon DB place-search cache lookup failed:", err);
  }

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.regularOpeningHours,places.photos,places.accessibilityOptions,places.types"
      },
      body: JSON.stringify({ textQuery: query, languageCode: locale })
    });
    const data = await res.json();
    if (!data.places) return [];
    
    const results = data.places.slice(0, 3).map((r: any) => {
      let imageUrl = undefined;
      if (r.photos && r.photos.length > 0) {
        // The photo is served through this app, so the key that fetches it stays on the server.
        if (isPlacePhotoName(r.photos[0].name)) imageUrl = placePhotoUrl(r.photos[0].name);
      }
      
      let priceLevel = undefined;
      if (r.priceLevel) {
        if (r.priceLevel === 'PRICE_LEVEL_FREE') priceLevel = locale === 'en' ? 'Free' : 'Gratis';
        if (r.priceLevel === 'PRICE_LEVEL_INEXPENSIVE') priceLevel = locale === 'en' ? 'Affordable' : 'Terjangkau';
        if (r.priceLevel === 'PRICE_LEVEL_MODERATE') priceLevel = locale === 'en' ? 'Moderate' : 'Menengah';
        if (r.priceLevel === 'PRICE_LEVEL_EXPENSIVE') priceLevel = locale === 'en' ? 'Expensive' : 'Mahal';
        if (r.priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE') priceLevel = locale === 'en' ? 'Very Expensive' : 'Sangat Mahal';
      }
      
      let open_now = undefined;
      if (r.regularOpeningHours) {
        open_now = r.regularOpeningHours.openNow;
      }
      
      return {
        name: r.displayName?.text,
        placeId: typeof r.id === "string" ? r.id : undefined,
        category: categoryFromTypes(r.types),
        accessibilityOptions: r.accessibilityOptions,
        types: r.types,
        rating: r.rating,
        priceLevel,
        address: r.formattedAddress,
        open_now,
        imageUrl
      };
    });

    // 2. Persist to Neon DB api_caches for 60 days
    if (results.length > 0) {
      const expiresAt = new Date(Date.now() + SIXTY_DAYS_MS);
      prisma.apiCache
        .upsert({
          where: { cacheKey },
          update: { payload: results as any, expiresAt },
          create: { cacheKey, payload: results as any, expiresAt },
        })
        .catch((saveErr) => console.warn("Gagal menyimpan place-search ke Neon DB:", saveErr));
    }

    return results;
  } catch {
    return [];
  }
}

async function executeGetTravelTime(origin: string, destination: string, locale: string = "id") {
  if (!GOOGLE_MAPS_API_KEY) return { error: "GOOGLE_MAPS_API_KEY belum dipasang di .env" };
  const cacheKey = `travel-time:${locale}:${origin.toLowerCase().trim()}->${destination.toLowerCase().trim()}`;

  // 1. Check Neon DB first
  try {
    const cached = await prisma.apiCache.findUnique({ where: { cacheKey } });
    if (cached && cached.expiresAt > new Date() && typeof cached.payload === "object" && cached.payload !== null) {
      return cached.payload as { distance?: string; duration?: string; error?: string };
    }
  } catch (err) {
    console.warn("Neon DB travel-time cache lookup failed:", err);
  }

  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?language=${locale}&origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`);
    const data = await res.json();
    const element = data.rows?.[0]?.elements?.[0];
    if (element?.status === "OK") {
      const result = {
        distance: element.distance.text,
        duration: element.duration.text
      };
      const expiresAt = new Date(Date.now() + SIXTY_DAYS_MS);
      prisma.apiCache
        .upsert({
          where: { cacheKey },
          update: { payload: result as any, expiresAt },
          create: { cacheKey, payload: result as any, expiresAt },
        })
        .catch(() => undefined);
      return result;
    }
    return { error: "Rute tidak ditemukan" };
  } catch {
    return { error: "Gagal menghubungi Maps API" };
  }
}

function detectTripFocalZone(draft: any): { zone: string; budgetTier: "budget" | "moderate" | "luxury" } {
  const memberWishes = (draft?.members || [])
    .flatMap((m: any) => [
      ...(m.customInterests || []).map((ci: any) => ci?.label || ""),
      ...(m.customNeeds || []),
    ])
    .join(" ");

  const destStr = [
    ...(draft?.destinations || []),
    draft?.extras?.mustVisit || "",
    draft?.extras?.lodging || "",
    draft?.notes || "",
    memberWishes,
  ].join(" ");
  const lower = destStr.toLowerCase();
  
  let zone = "";
  if (lower.includes("glodok") || lower.includes("petak sembilan") || lower.includes("pancoran glodok") || lower.includes("taman sari") || lower.includes("mangga besar") || lower.includes("grogol") || lower.includes("central park") || lower.includes("tanjung duren") || lower.includes("puri") || lower.includes("kebon jeruk") || lower.includes("tomang") || lower.includes("slipi") || lower.includes("roxy") || lower.includes("jakbar") || lower.includes("jakarta barat")) {
    zone = "Jakarta Barat";
  } else if (lower.includes("pik") || lower.includes("pantai indah kapuk") || lower.includes("ancol") || lower.includes("dufan") || lower.includes("kelapa gading") || lower.includes("muara karang") || lower.includes("pluit") || lower.includes("sunter") || lower.includes("pademangan") || lower.includes("jakut") || lower.includes("jakarta utara")) {
    zone = "Jakarta Utara";
  } else if (lower.includes("kota tua") || lower.includes("monas") || lower.includes("menteng") || lower.includes("thamrin") || lower.includes("pasar baru") || lower.includes("senen") || lower.includes("gambir") || lower.includes("tanah abang") || lower.includes("sarinah") || lower.includes("bundaran hi") || lower.includes("cikini") || lower.includes("salemba") || lower.includes("kemayoran") || lower.includes("jakpus") || lower.includes("jakarta pusat")) {
    zone = "Jakarta Pusat";
  } else if (lower.includes("blok m") || lower.includes("senopati") || lower.includes("kemang") || lower.includes("scbd") || lower.includes("cilandak") || lower.includes("pondok indah") || lower.includes("tebet") || lower.includes("senayan") || lower.includes("kuningan") || lower.includes("mampang") || lower.includes("fatmawati") || lower.includes("cipete") || lower.includes("jaksel") || lower.includes("jakarta selatan")) {
    zone = "Jakarta Selatan";
  } else if (lower.includes("tmii") || lower.includes("taman mini") || lower.includes("rawamangun") || lower.includes("jatinegara") || lower.includes("matraman") || lower.includes("cibubur") || lower.includes("jaktim") || lower.includes("jakarta timur")) {
    zone = "Jakarta Timur";
  } else if (lower.includes("ubud") || lower.includes("tegallalang")) {
    zone = "Ubud";
  } else if (lower.includes("canggu") || lower.includes("seminyak") || lower.includes("kuta") || lower.includes("legian") || lower.includes("pererenan")) {
    zone = "Seminyak Kuta";
  } else if (lower.includes("uluwatu") || lower.includes("jimbaran") || lower.includes("nusa dua") || lower.includes("pecatu")) {
    zone = "Nusa Dua Jimbaran";
  } else if (lower.includes("sanur") || lower.includes("denpasar")) {
    zone = "Sanur Denpasar";
  } else if (lower.includes("malioboro") || lower.includes("kraton") || lower.includes("prawirotaman") || lower.includes("tugu jogja") || lower.includes("kotagede")) {
    zone = "Malioboro";
  } else if (lower.includes("kaliurang") || lower.includes("merapi")) {
    zone = "Kaliurang";
  } else if (lower.includes("lembang") || lower.includes("maribaya") || lower.includes("ciater")) {
    zone = "Lembang";
  } else if (lower.includes("dago") || lower.includes("riau") || lower.includes("braga") || lower.includes("asia afrika") || lower.includes("gedung sate")) {
    zone = "Dago";
  } else if (lower.includes("ciwidey") || lower.includes("rancabali") || lower.includes("pangalengan")) {
    zone = "Ciwidey";
  }

  const totalBudget = draft?.budget || 0;
  const days = (draft?.startDate && draft?.endDate) 
    ? Math.max(1, Math.round((Date.parse(draft.endDate) - Date.parse(draft.startDate)) / 86400000) + 1) 
    : 1;

  // Lodging fairly takes about 35% of the budget, spread over the trip's days.
  const estimatedLodgingPerNight = totalBudget > 0 ? (totalBudget * 0.35) / days : 750000;
  
  let budgetTier: "budget" | "moderate" | "luxury" = "moderate";
  if (estimatedLodgingPerNight < 500000) {
    budgetTier = "budget";
  } else if (estimatedLodgingPerNight > 1600000) {
    budgetTier = "luxury";
  }

  return { zone, budgetTier };
}

export async function runTripPlanningFlow(requestBody: any) {
  const { draft, locale } = requestBody;

  // The trip's main area and budget tier narrow the hotel search, so the suggestions fit the group and vary.
  const { zone, budgetTier } = detectTripFocalZone(draft);
  const primaryDestination = draft?.destinations?.[0];

  let liveHotels: HotelDeal[] = [];
  let liveAttractions: AttractionDeal[] = [];

  if (primaryDestination) {
    try {
      const [hotels, attractions] = await Promise.all([
        searchBookingHotels(
          primaryDestination,
          draft?.startDate,
          draft?.endDate,
          draft?.members?.length || 2,
          zone || undefined,
          budgetTier
        ),
        getCachedAmusementAndAttractions(primaryDestination, zone || undefined)
      ]);
      liveHotels = hotels;
      liveAttractions = attractions;
    } catch (e) {
      console.warn("Gagal mengambil data live hotel/attractions:", e);
    }
  }

  // Single-pass planning to save tokens
  const currentPlan = await plannerAgent(draft, locale, liveHotels, liveAttractions, zone, budgetTier);

  
function evaluateRules(item: any, place: any, draft: any, locale: string = "id") {
  const covers: any[] = [];
  const violations: any[] = [];

  const requiredNeeds = new Map<string, string[]>();
  if (draft.members && Array.isArray(draft.members)) {
    draft.members.forEach((m: any) => {
      if (m.needs && Array.isArray(m.needs)) {
        m.needs.forEach((need: string) => {
          if (!requiredNeeds.has(need)) requiredNeeds.set(need, []);
          requiredNeeds.get(need)!.push(m.id);
        });
      }
    });
  }

  // Deterministic checks based on item title, detail, and place data
  const text = ((item.title || "") + " " + (item.detail || "") + " " + (place?.types?.join(" ") || "")).toLowerCase();
  
  for (const [need, memberIds] of requiredNeeds.entries()) {
    let isCovered = false;
    let isViolated = false;
    let reason = "";

    if (need === "wheelchair") {
      if (place && place.accessibilityOptions && place.accessibilityOptions.wheelchairAccessibleEntrance) {
        isCovered = true;
      } else if (text.includes("wheelchair") || text.includes("kursi roda") || text.includes("ramah difabel")) {
        isCovered = true;
      } else {
        isViolated = true;
        reason = locale === "en" ? "It is unconfirmed whether this place has wheelchair access." : "Tempat ini belum terkonfirmasi memiliki akses kursi roda.";
      }
    } else if (need === "halal") {
      if (text.includes("halal") || text.includes("muslim") || text.includes("masjid")) {
        isCovered = true;
      } else if (text.includes("pork") || text.includes("babi") || text.includes("beer") || text.includes("bar ") || text.includes("pub ")) {
        isViolated = true;
        reason = locale === "en" ? "There are indications this place is not halal (serves alcohol/non-halal items)." : "Terdapat indikasi tempat ini tidak halal (menyajikan alkohol/non-halal).";
      } else {
        // Assume safe but not covered explicitly unless it's a food place
        if (text.includes("restaurant") || text.includes("makan") || text.includes("warung")) {
          isViolated = true;
          reason = locale === "en" ? "There is no confirmed halal certification for this eatery." : "Belum ada konfirmasi sertifikasi halal untuk tempat makan ini.";
        }
      }
    } else if (need === "vegetarian" || need === "vegan") {
      if (text.includes("veget") || text.includes("vegan") || text.includes("plant-based") || text.includes("sayur")) {
        isCovered = true;
      } else if (text.includes("steak") || text.includes("bbq") || text.includes("seafood") || text.includes("ikan bakar")) {
        isViolated = true;
        reason = locale === "en" ? "This place focuses on meat/seafood menus, making it hard to find vegetarian/vegan options." : "Tempat ini fokus pada menu daging/seafood, sulit menemukan opsi vegetarian/vegan.";
      }
    } else if (need === "noStairs" || need === "shortWalks") {
      if (text.includes("hike") || text.includes("mendaki") || text.includes("bukit") || text.includes("gunung") || text.includes("stairs") || text.includes("tangga")) {
        isViolated = true;
        reason = locale === "en" ? "This activity requires a lot of walking or climbing stairs." : "Aktivitas ini membutuhkan banyak jalan kaki atau naik tangga.";
      }
    } else if (need === "quiet" || need === "noCrowds") {
      if (text.includes("club") || text.includes("party") || text.includes("pasar") || text.includes("market") || text.includes("crowd") || text.includes("ramai")) {
        isViolated = true;
        reason = locale === "en" ? "This place tends to be very crowded and noisy." : "Tempat ini cenderung sangat ramai dan berisik.";
      }
    }

    if (isCovered) covers.push({ need, memberIds });
    if (isViolated) violations.push({ need, reason });
  }

  item.covers = covers;
  item.violations = violations;
}


// Looks each backup up and runs it through the same checks as a main stop, so what is offered on the day has
// already been held against the group's needs. Backups that pass every check come first.
async function checkBackups(item: any, draft: any, locale: string) {
  const listed: any[] = Array.isArray(item.backups) ? item.backups : [];
  const usable = listed
    .filter(
      (backup) =>
        BACKUP_KINDS.some((kind) => kind === backup?.kind) &&
        typeof backup.title === "string" &&
        backup.title.trim() !== "" &&
        backup.title.trim().toLowerCase() !== String(item.title).trim().toLowerCase(),
    )
    .slice(0, MAX_BACKUPS_PER_STOP);
  const checked = await Promise.all(
    usable.map(async (backup) => {
      const places = await executeSearchPlaces(cleanPlaceQuery(backup.title, draft.destinations?.[0]), locale);
      const place = places?.[0] || null;
      const entry: any = {
        kind: backup.kind,
        title: backup.title.trim(),
        detail: typeof backup.detail === "string" ? backup.detail : "",
        imageUrl: place?.imageUrl,
        category: place?.category ?? inferCategoryFromTitle(backup.title),
        placeId: place?.placeId,
        address: place?.address,
        rating: place?.rating,
        priceLevel: place?.priceLevel,
        openingHours: place?.open_now !== undefined ? (place.open_now ? (locale === "en" ? "Open Now" : "Buka Sekarang") : (locale === "en" ? "Closed" : "Tutup")) : undefined,
      };
      evaluateRules(entry, place, draft, locale);
      return entry;
    }),
  );
  return checked.sort((first, second) => first.violations.length - second.violations.length);
}

function cleanPlaceQuery(title: string, destination?: string): string {
  let cleaned = (title || "").trim();
  // Leading action words such as "Check-in di" or "Makan siang di" are dropped, so only the place is searched.
  cleaned = cleaned.replace(
    /^(check[- ]?in (di |ke )?|menginap di |sarapan (pagi )?(di )?|makan (siang|malam) (di )?|kulineran (di )?|kunjungan (ke )?|menuju (ke )?|belanja di |wisata (ke )?)/i,
    ""
  ).trim();

  // A title that was only an action leaves "hotel" or nothing; the search then falls back to the destination's hotels.
  if (/^hotel$/i.test(cleaned) || !cleaned) {
    return destination ? `Hotel terbaik di ${destination}` : "Hotel";
  }

  const dest = destination?.trim();
  if (dest && !cleaned.toLowerCase().includes(dest.toLowerCase())) {
    cleaned = `${cleaned} ${dest}`;
  }
  return cleaned.trim();
}

  // Stops are looked up one after another, so the outside APIs' rate limits are not hit.
  if (currentPlan.days && Array.isArray(currentPlan.days)) {
    for (const day of currentPlan.days) {
      if (day.items && Array.isArray(day.items)) {
        for (let i = 0; i < day.items.length; i++) {
          const item = day.items[i];
          const arr = day.items;
          try {
            const query = cleanPlaceQuery(item.title, draft.destinations?.[0]);
            const places = await executeSearchPlaces(query, locale);
            if (places && Array.isArray(places) && places.length > 0) {
              const place = places[0];
              item.imageUrl = place.imageUrl || item.imageUrl;
              item.placeId = place.placeId || item.placeId;
              item.category = place.category;
              item.address = place.address || item.address;
              item.rating = place.rating || item.rating;
              item.priceLevel = place.priceLevel || item.priceLevel;
              item.openingHours = place.open_now !== undefined ? (place.open_now ? (locale === "en" ? "Open Now" : "Buka Sekarang") : (locale === "en" ? "Closed" : "Tutup")) : item.openingHours;
            }
            evaluateRules(item, places?.[0] || null, draft, locale);
            item.backups = await checkBackups(item, draft, locale);
            
            if (i < arr.length - 1) {
              const nextItem = arr[i + 1];
              const q1 = cleanPlaceQuery(item.title, draft.destinations?.[0]);
              const q2 = cleanPlaceQuery(nextItem.title, draft.destinations?.[0]);
              const t = await executeGetTravelTime(q1, q2, locale);
              if (t.distance && t.duration) {
                item.travelToNext = { distance: t.distance, duration: t.duration };
              }
            }
            
            // Add a small delay to respect API rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch {
            console.error("Gagal memperkaya data untuk", item.title);
          }
        }
      }
    }
  }

  return currentPlan;
}

async function runAgent(systemInstruction: string, promptText: string, locale: string = "id") {
  const langStr = locale === "en" ? "ENGLISH" : "INDONESIAN";
  const interaction = await client.interactions.create({
    model: 'gemini-3.5-flash-lite',
    system_instruction: systemInstruction + `\nIMPORTANT: ALWAYS generate the output content (like titles, details) strictly in ${langStr} language.`,
    input: promptText,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: {
        type: "object",
        properties: {
          agentic_evaluation: {
            type: "string",
            description: "Step-by-step reasoning: 1) Verify all extras.mustVisit venues and schedule them as anchor stops on designated days. 2) Check STRICT SAME-DAY GEOGRAPHIC CLUSTERING: Ensure all stops for each day are in the exact same neighborhood (NO cross-city commute like Glodok to Kelapa Gading!). 3) Check that every member's needs (accessibility, diet/halal) and custom wishes are fulfilled."
          },
          days: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      time: { type: "string" },
                      title: { type: "string", description: "Specific real venue name on Google Maps (e.g. 'Talassa Jakarta - Cove at Batavia', 'Mercure Jakarta Batavia', 'Museum Nasional Indonesia'). NEVER generic titles like 'Check-in', 'Check-in Hotel', or 'Makan Siang'." },
                      detail: { type: "string" },
                      backups: {
                        type: "array",
                        description: "1 or 2 fallback places for this exact time slot, each one checked against the members' needs.",
                        items: {
                          type: "object",
                          properties: {
                            kind: { type: "string", enum: [...BACKUP_KINDS] },
                            title: { type: "string", description: "Specific real venue name on Google Maps, not used anywhere else in the plan." },
                            detail: { type: "string" }
                          },
                          required: ["kind", "title", "detail"]
                        }
                      }
                    },
                    required: ["time", "title", "detail", "backups"]
                  }
                }
              },
              required: ["date", "items"]
            }
          }
        },
        required: ["agentic_evaluation", "days"]
      }
    }
  });

  try {
    return JSON.parse(interaction.output_text || "{}");
  } catch {
    return { days: [] };
  }
}

function formatTripExtras(draft: any): string {
  const ex = draft?.extras || {};
  const lines: string[] = [];

  if (ex.mustVisit && String(ex.mustVisit).trim()) {
    lines.push(`- MUST-VISIT ATTRACTIONS & STOPS (NON-NEGOTIABLE): "${ex.mustVisit}" -> YOU MUST INCLUDE THESE EXACT VENUES/PLACES IN THE ITINERARY DAYS!`);
  }
  if (ex.avoid && String(ex.avoid).trim()) {
    lines.push(`- STRICTLY AVOID (DO NOT INCLUDE): "${ex.avoid}"`);
  }
  if (ex.lodging && String(ex.lodging).trim()) {
    lines.push(`- USER SPECIFIED LODGING: "${ex.lodging}"`);
  }
  if (ex.arrivalTime || ex.departureTime) {
    lines.push(`- ARRIVAL / DEPARTURE: Arrives at ${ex.arrivalTime || "Flexible"}, Departs at ${ex.departureTime || "Flexible"}`);
  }
  if (ex.dayStart || ex.dayEnd) {
    lines.push(`- DAILY TIME WINDOW: Starts around ${ex.dayStart || "09:00"}, Ends around ${ex.dayEnd || "21:00"}`);
  }
  const transportList = [...(ex.transport || []), ...(ex.customTransport || [])];
  if (transportList.length > 0) {
    lines.push(`- TRANSPORTATION MODE: ${transportList.join(", ")}`);
  }
  if (ex.occasion && String(ex.occasion).trim()) {
    lines.push(`- SPECIAL OCCASION: "${ex.occasion}"`);
  }
  if (draft?.notes && String(draft.notes).trim()) {
    lines.push(`- TRIP NOTES / SPECIAL REQUESTS: "${draft.notes}"`);
  }

  return lines.length > 0 ? lines.join("\n") : "No specific extras specified.";
}

function formatMemberProfiles(members: any[]): string {
  if (!Array.isArray(members) || members.length === 0) return "Standard group profile.";

  return members.map((m: any, idx: number) => {
    const ageStr = m.age ? `${m.age} years old` : (m.ageGroup || "adult");
    const name = m.name || `Member ${idx + 1}`;
    
    const needsList: string[] = [];
    if (Array.isArray(m.needs)) needsList.push(...m.needs);
    if (Array.isArray(m.customNeeds)) needsList.push(...m.customNeeds);
    
    const mustWishes: string[] = [];
    const niceWishes: string[] = [];
    if (m.interests && typeof m.interests === "object") {
      for (const [key, level] of Object.entries(m.interests)) {
        if (level === "must") mustWishes.push(key);
        else if (level === "nice") niceWishes.push(key);
      }
    }
    if (Array.isArray(m.customInterests)) {
      for (const ci of m.customInterests) {
        if (!ci?.label) continue;
        if (ci.level === "must") mustWishes.push(`"${ci.label}"`);
        else niceWishes.push(`"${ci.label}"`);
      }
    }

    const lines: string[] = [`- ${name} (${ageStr}):`];
    if (needsList.length > 0) lines.push(`  * Needs: ${needsList.join(", ")}`);
    if (m.allergies) lines.push(`  * Allergies/Diet: ${m.allergies}`);
    if (mustWishes.length > 0) lines.push(`  * MUST-HAVE WISHES: ${mustWishes.join(", ")}`);
    if (niceWishes.length > 0) lines.push(`  * Nice-to-have wishes: ${niceWishes.join(", ")}`);
    
    return lines.join("\n");
  }).join("\n");
}

async function plannerAgent(
  draft: any,
  locale: string,
  liveHotels: HotelDeal[] = [],
  liveAttractions: AttractionDeal[] = [],
  focalZone?: string,
  budgetTier?: "budget" | "moderate" | "luxury"
) {
  const memberCount = Array.isArray(draft.members) && draft.members.length > 0 ? draft.members.length : 1;
  const daysCount = (draft.startDate && draft.endDate) 
    ? Math.max(1, Math.round((Date.parse(draft.endDate) - Date.parse(draft.startDate)) / 86400000) + 1) 
    : 1;
  const totalBudget = draft.budget || null;
  const budgetPerPersonPerDay = totalBudget ? Math.round(totalBudget / (memberCount * daysCount)) : null;

  const zoneInfo = focalZone ? ` (ZONA WISATA UTAMA: ${focalZone}, KATEGORI BUDGET: ${budgetTier?.toUpperCase()})` : "";
  const liveHotelPrompt = liveHotels.length > 0
    ? `\n\nREAL LIVE BOOKING.COM HOTEL DEALS FOUND FOR ${draft.destinations?.[0] || 'DESTINATION'}${zoneInfo}:\n` +
      liveHotels.map((h, i) => `${i + 1}. "${h.name}" - ${h.priceFormatted || "Harga variatif"} (Rating: ${h.rating ? h.rating + "/5" : "N/A"})\n   Alamat/Zona: ${h.address || ""}`).join("\n") +
      `\nCRITICAL PROXIMITY & ZONE INSTRUCTION:
- If user did NOT specify extras.lodging, pick one of these real hotels located closest to Day 1's main attractions as the title for your accommodation/check-in stop.
- ENSURE the hotel is in the SAME geographic zone as the activities (NO cross-city commute!).
- Offer one or two of the other hotels as that stop's "backups" (kind "closed"), with their exact prices in the backup's detail!`
    : "";

  const liveAttractionPrompt = liveAttractions.length > 0
    ? `\n\nVERIFIED POPULAR AMUSEMENT & ATTRACTIONS CATALOGUE (FROM DB CACHE):\n` +
      liveAttractions.map((a, i) => `${i + 1}. "${a.name}" (${a.category || "Atraksi"}) - ${a.priceFormatted || "Tiket terjangkau"}\n   Deskripsi/Lokasi: ${a.description || a.address || ""}`).join("\n") +
      `\nIncorporate these verified amusement and attraction places for daytime itinerary stops when relevant to members' interests!`
    : "";

  const extrasPrompt = `\n\n=== TRIP EXTRAS & USER CONSTRAINTS ===\n${formatTripExtras(draft)}`;
  const membersPrompt = `\n\n=== GROUP MEMBERS, SPECIFIC WISHES & ACCESSIBILITY NEEDS ===\n${formatMemberProfiles(draft.members)}`;

  return await runAgent(
    `You are an expert, meticulous, and realistic AI Trip Planner. Create a detailed, day-by-day itinerary based on the user's trip plan data.${extrasPrompt}${membersPrompt}${liveHotelPrompt}${liveAttractionPrompt}${mediationBrief(draft, locale)}

CRITICAL RULES FOR ACCURACY, PLACES & BUDGET:
1. MANDATORY MUST-VISIT ATTRACTIONS & STOPS:
   - If user specified "extras.mustVisit" (e.g. "${draft?.extras?.mustVisit || ''}"), EVERY place or venue listed is NON-NEGOTIABLE and MUST appear as a primary stop in the itinerary!
   - You MUST design that day's schedule around these anchor stops. NEVER omit, replace, or skip them.

2. STRICT SAME-DAY GEOGRAPHIC CLUSTERING (NO CROSS-CITY COMMUTES):
   - CRITICAL PROXIMITY RULE: All stops on any given day MUST be clustered within the same local neighborhood or adjacent district (under 15-20 minutes / maximum 5-10 km travel radius).
   - NEVER schedule stops across far opposite ends of a metropolis on the same day!
     * Example of severe failure: Scheduling a morning or lunch stop in Glodok / Kota Tua (West/Central Jakarta) and an afternoon stop in Kelapa Gading (North-East Jakarta). They are 18+ km apart with heavy traffic!
     * If the day includes a stop in Glodok, ALL stops for that day (morning coffee, lunch, afternoon cultural walk, dinner, and hotel check-in) MUST be in the Glodok / Kota Tua / Mangga Besar / Hayam Wuruk / West-Central Jakarta area!
     * If the trip spans multiple days, dedicate different days to distinct neighborhood clusters (e.g. Day 1 in Glodok & Kota Tua; Day 2 in Senopati & Blok M).

3. STRICT USER AVOIDANCE:
   - If user specified "extras.avoid" (e.g. "${draft?.extras?.avoid || ''}"), you are STRICTLY FORBIDDEN from including any of those venues, crowds, or food items.

4. SPECIFIC REAL VENUES ONLY (NO GENERIC ACTIVITY TITLES):
   - NEVER use generic activity titles like "Check-in Hotel", "Check in", "Istirahat", "Makan Siang", "Makan Malam", "Kulineran".
   - "title" MUST ALWAYS BE A REAL, SPECIFIC, SEARCHABLE VENUE/PLACE NAME on Google Maps.

5. HOTEL & ACCOMMODATION RULES (STRICT ZONE & PROXIMITY):
   - The hotel MUST be located in the SAME geographic cluster as Day 1's activities (e.g. if Day 1 activities are in Glodok / West Jakarta, the hotel MUST be in West Jakarta / Glodok, NEVER Kelapa Gading or South Jakarta!).
   - If user specified "extras.lodging" in the draft, USE THAT HOTEL as the "title" for accommodation/check-in.
   - If user did NOT specify a hotel: Select 1 REAL HOTEL matching the zone and budget tier as the "title".
   - In the "detail" of the hotel check-in stop: a brief description with the estimated price per night. Real alternative hotels nearby go in that stop's "backups" (kind "closed"), each with its estimated price per night in the backup's detail.

6. DINING & RESTAURANT RULES (BUDGET-AWARE):
   - For every meal stop (breakfast, lunch, dinner), "title" MUST be a SPECIFIC, REAL RESTAURANT or EATERY NAME.
   - NEVER name just a general area, complex, or mall. Instead, write the exact restaurant within that area (e.g. "Pantjoran Tea House" or "Kopi Es Tak Kie" in Glodok).
   - BUDGET ALIGNMENT: 
     ${totalBudget ? `Total group budget is Rp ${totalBudget.toLocaleString('id-ID')} for ${memberCount} people across ${daysCount} days (approx. Rp ${budgetPerPersonPerDay?.toLocaleString('id-ID')} per person/day). Pick restaurants whose price range logically fits this budget! Mention estimated price per person in the detail.` : 'Pick popular, high-value restaurants suitable for travelers and their budget.'}
   - STRICT DIET & ALLERGIES: Honour halal, vegetarian, vegan, and member allergy constraints strictly. If halal is requested, choose halal-certified or Muslim-friendly spots.
   - In the "detail": Mention recommended signature dishes and the approximate price per person. Alternative eateries go in "backups", not in the detail.

7. LOGICAL TIMINGS & REALISTIC PACE:
   - Account for travel distance and traffic between consecutive stops.
   - Respect daily time windows (extras.dayStart to extras.dayEnd) and arrival/departure times.
   - If pace is 'relaxed', do not pack more than 3-4 key stops per day with ample rest.

8. SPECIAL NEEDS & MEMBER WISHES:
   - Member accessibility needs (wheelchair, stroller/no stairs, elderly, toddlers) must be prioritized in venue selection.
   - Honour members' "customNeeds", "customInterests" (level "must" is MANDATORY; level "nice" is prioritized if time permits), and free-text "notes".
   - Stated needs are NEVER traded away.

9. A BACKUP PLAN FOR EVERY STOP ("backups"):
   - Give EVERY stop 1 or 2 backups for the same time slot, so the group already has somewhere to go when the stop cannot happen.
   - "kind" says when the backup is for: "rain" = an INDOOR place for a rainy day (every outdoor stop needs one); "rest" = a calm place close by to sit and recover; "meal" = a replacement restaurant; "closed" = a similar place for when the stop is closed or full.
   - A backup "title" is a SPECIFIC REAL venue on Google Maps within about 15 minutes of the stop it replaces. Never reuse a place that appears anywhere else in the plan.
   - A backup honours every member's needs, diet, and allergies exactly like a main stop does.

Do it perfectly on the first try.`,
    `Please generate a detailed itinerary for:
${JSON.stringify(draft, null, 2)}`,
    locale
  );
}
