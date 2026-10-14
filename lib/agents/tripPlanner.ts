/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenAI } from '@google/genai';
import { BACKUP_KINDS } from '@/lib/client/captain';
import { mediationBrief } from './mediationBrief';
import { categoryFromTypes, isPlacePhotoName, placePhotoUrl } from '@/lib/place-category';
import { 
  searchBookingHotels, 
  getCachedAmusementAndAttractions, 
  type HotelDeal, 
  type AttractionDeal 
} from '@/lib/hotel-search';

const client = new GoogleGenAI({});

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const MAX_BACKUPS_PER_STOP = 2;

export async function executeSearchPlaces(query: string, locale: string = "id") {
  if (!GOOGLE_MAPS_API_KEY) return [];
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
    
    return data.places.slice(0, 3).map((r: any) => {
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
  } catch {
    return [];
  }
}

async function executeGetTravelTime(origin: string, destination: string, locale: string = "id") {
  if (!GOOGLE_MAPS_API_KEY) return { error: "GOOGLE_MAPS_API_KEY belum dipasang di .env" };
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?language=${locale}&origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`);
    const data = await res.json();
    const element = data.rows?.[0]?.elements?.[0];
    if (element?.status === "OK") {
      return {
        distance: element.distance.text,
        duration: element.duration.text
      };
    }
    return { error: "Rute tidak ditemukan" };
  } catch {
    return { error: "Gagal menghubungi Maps API" };
  }
}

function detectTripFocalZone(draft: any): { zone: string; budgetTier: "budget" | "moderate" | "luxury" } {
  const destStr = (draft?.destinations || []).join(" ") + " " + (draft?.extras?.mustVisit || "") + " " + (draft?.extras?.lodging || "") + " " + (draft?.notes || "");
  const lower = destStr.toLowerCase();
  
  let zone = "";
  if (lower.includes("pik") || lower.includes("pantai indah kapuk") || lower.includes("ancol") || lower.includes("dufan") || lower.includes("kelapa gading") || lower.includes("muara karang") || lower.includes("pluit") || lower.includes("jakut")) {
    zone = "Jakarta Utara";
  } else if (lower.includes("blok m") || lower.includes("senopati") || lower.includes("kemang") || lower.includes("scbd") || lower.includes("cilandak") || lower.includes("pondok indah") || lower.includes("tebet") || lower.includes("jaksel")) {
    zone = "Jakarta Selatan";
  } else if (lower.includes("kota tua") || lower.includes("monas") || lower.includes("menteng") || lower.includes("thamrin") || lower.includes("pasar baru") || lower.includes("jakpus")) {
    zone = "Jakarta Pusat";
  } else if (lower.includes("grogol") || lower.includes("central park") || lower.includes("tanjung duren") || lower.includes("jakbar")) {
    zone = "Jakarta Barat";
  } else if (lower.includes("ubud")) {
    zone = "Ubud";
  } else if (lower.includes("canggu") || lower.includes("seminyak") || lower.includes("kuta") || lower.includes("legian")) {
    zone = "Seminyak Kuta";
  } else if (lower.includes("uluwatu") || lower.includes("jimbaran") || lower.includes("nusa dua")) {
    zone = "Nusa Dua Jimbaran";
  } else if (lower.includes("malioboro") || lower.includes("kraton") || lower.includes("prawirotaman")) {
    zone = "Malioboro";
  } else if (lower.includes("kaliurang") || lower.includes("merapi")) {
    zone = "Kaliurang";
  } else if (lower.includes("lembang")) {
    zone = "Lembang";
  } else if (lower.includes("dago") || lower.includes("riau") || lower.includes("braga")) {
    zone = "Dago";
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
        address: place?.address,
        rating: place?.rating,
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
            description: "Step-by-step reasoning: analyze constraints (budget, pace, accessibility, diet), evaluate feasibility, and plan the itinerary strategy BEFORE generating the days. Act as your own Rule Guardian."
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

  return await runAgent(
    `You are an expert, meticulous, and realistic AI Trip Planner. Create a detailed, day-by-day itinerary based on the user's trip plan data.${liveHotelPrompt}${liveAttractionPrompt}${mediationBrief(draft, locale)}

CRITICAL RULES FOR ACCURACY, PLACES & BUDGET:
1. SPECIFIC REAL VENUES ONLY (NO GENERIC ACTIVITY TITLES):
   - NEVER use generic activity titles like "Check-in Hotel", "Check in", "Istirahat", "Makan Siang", "Makan Malam", "Kulineran".
   - "title" MUST ALWAYS BE A REAL, SPECIFIC, SEARCHABLE VENUE/PLACE NAME on Google Maps.

2. HOTEL & ACCOMMODATION RULES (STRICT ZONE & PROXIMITY):
   - CRITICAL PROXIMITY RULE: The hotel MUST be located in the SAME geographic cluster as Day 1's activities (e.g. if Day 1 activities are in North Jakarta / PIK / Ancol, the hotel MUST be in North Jakarta / PIK, NEVER South Jakarta!).
   - If user specified "extras.lodging" in the draft, USE THAT HOTEL as the "title" for accommodation/check-in.
   - If user did NOT specify a hotel: Select 1 REAL HOTEL matching the zone and budget tier as the "title".
   - In the "detail" of the hotel check-in stop: a brief description with the estimated price per night. Real alternative hotels nearby go in that stop's "backups" (kind "closed"), each with its estimated price per night in the backup's detail.

3. DINING & RESTAURANT RULES (BUDGET-AWARE):
   - For every meal stop (breakfast, lunch, dinner), "title" MUST be a SPECIFIC, REAL RESTAURANT or EATERY NAME.
   - NEVER name just a general area, complex, or mall (e.g. NEVER write "Makan di Cove at Batavia" or "Mall Central Park"). Instead, write the exact restaurant within that area, e.g. "Talassa Jakarta - Cove at Batavia PIK" or "Remboelan - Senayan City".
   - BUDGET ALIGNMENT: 
     ${totalBudget ? `Total group budget is Rp ${totalBudget.toLocaleString('id-ID')} for ${memberCount} people across ${daysCount} days (approx. Rp ${budgetPerPersonPerDay?.toLocaleString('id-ID')} per person/day). Pick restaurants whose price range logically fits this budget! Mention estimated price per person in the detail.` : 'Pick popular, high-value restaurants suitable for travelers and their budget.'}
   - STRICT DIET & ALLERGIES: Honour halal, vegetarian, vegan, and member allergy constraints strictly. If halal is requested, choose halal-certified or Muslim-friendly spots.
   - In the "detail": Mention recommended signature dishes and the approximate price per person. Alternative eateries go in "backups", not in the detail.

4. LOGICAL TIMINGS & REALISTIC PACE:
   - Account for travel distance and traffic between consecutive stops.
   - If pace is 'relaxed', do not pack more than 3-4 key stops per day with ample rest.

5. SPECIAL NEEDS & CUSTOM WISHES:
   - Member needs (wheelchair, stroller/no stairs, elderly, toddlers) must be prioritized in venue selection.
   - Honour members' "customNeeds", "customInterests", and free-text "notes".
   - Besides the fixed choices, the data holds entries people typed themselves: a member's exact "age", "customNeeds" and "customInterests" (level "must" outranks "nice"), the trip's "extras.customTransport", and the free-text "notes". Honour them exactly like the fixed ones.

6. A BACKUP PLAN FOR EVERY STOP ("backups"):
   - Give EVERY stop 1 or 2 backups for the same time slot, so the group already has somewhere to go when the stop cannot happen. They are prepared now because on the day there may be no internet.
   - "kind" says when the backup is for: "rain" = an INDOOR place for a rainy day (every outdoor stop needs one); "rest" = a calm place close by to sit and recover, such as a café, a lounge, or a shaded seating area; "meal" = a replacement restaurant (every meal stop needs one); "closed" = a similar place for when the stop is closed or full.
   - A backup "title" is a SPECIFIC REAL venue on Google Maps within about 15 minutes of the stop it replaces. Never reuse a place that appears anywhere else in the plan.
   - A backup honours every member's needs, diet, and allergies exactly like a main stop does. Its "detail" says in one or two sentences why it suits this group and what to know before going (indoor or outdoor, price, opening hours).

Do it perfectly on the first try.`,
    `Please generate a detailed itinerary for:
${JSON.stringify(draft, null, 2)}`,
    locale
  );
}
