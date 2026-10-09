/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenAI } from '@google/genai';
import { findDateRange } from '@/lib/api/sample-dates';
import { buildCaptainInput, buildCaptainInstruction, readHistory, settleTripEnd } from './captainPrompt';

const ai = new GoogleGenAI({});
const client = ai;

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// ============================================================================
// TOOLS UNTUK AI
// ============================================================================
const searchPlacesDeclaration = {
  name: "searchPlaces",
  type: "function",
  description: "Cari tempat di Google Maps (misal: 'Hotel murah di Bali', 'Pantai di Lombok')",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Kata kunci pencarian" }
    },
    required: ["query"]
  }
};

const getTravelTimeDeclaration = {
  name: "getTravelTime",
  type: "function",
  description: "Dapatkan estimasi waktu tempuh dari origin ke destination.",
  parameters: {
    type: "object",
    properties: {
      origin: { type: "string" },
      destination: { type: "string" }
    },
    required: ["origin", "destination"]
  }
};

async function executeSearchPlaces(query: string, locale: string = "id") {
  if (!GOOGLE_MAPS_API_KEY) return [];
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.regularOpeningHours,places.photos,places.accessibilityOptions,places.types"
      },
      body: JSON.stringify({ textQuery: query, languageCode: locale })
    });
    const data = await res.json();
    if (!data.places) return [];
    
    return data.places.slice(0, 3).map((r: any) => {
      let imageUrl = undefined;
      if (r.photos && r.photos.length > 0) {
        imageUrl = `https://places.googleapis.com/v1/${r.photos[0].name}/media?maxHeightPx=400&maxWidthPx=400&key=${GOOGLE_MAPS_API_KEY}`;
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
        accessibilityOptions: r.accessibilityOptions,
        types: r.types,
        rating: r.rating,
        priceLevel,
        address: r.formattedAddress,
        open_now,
        imageUrl
      };
    });
  } catch(e: any) {
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
  } catch (e) {
    return { error: "Gagal menghubungi Maps API" };
  }
}

const toolExecutors: Record<string, (...args: any[]) => any> = {
  searchPlaces: (args: any) => executeSearchPlaces(args.query),
  getTravelTime: (args: any) => executeGetTravelTime(args.origin, args.destination),
};

// ============================================================================
// 1. CAPTAIN AGENT (Mengurus Chat & Ekstraksi Data)
// ============================================================================
export async function captainAgentReply(requestBody: any) {
  const { story, draft, locale } = requestBody;
  const history = readHistory(requestBody.history);
  const today = new Date().toISOString().split("T")[0];
  const statedDates = findDateRange(typeof story === "string" ? story : "", new Date());

  const interaction = await client.interactions.create({
    model: 'gemini-3.5-flash-lite',
    input: buildCaptainInput(story, statedDates ? { ...draft, ...statedDates } : draft, history),
    system_instruction: buildCaptainInstruction(locale, today),
    generation_config: { max_output_tokens: 2048 },
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: {
        type: "object",
        properties: {
          message: { type: "string" },
          action: { type: "string", enum: ["ask", "confirm", "proceed"] },
          draftPatch: {
            type: "object",
            properties: {
              origin: { type: "string" },
              destinations: { type: "array", items: { type: "string" } },
              startDate: { type: "string", format: "date", description: "Format YYYY-MM-DD. Jangan diisi jika tidak ada." },
              endDate: { type: "string", format: "date", description: "Format YYYY-MM-DD. Jangan diisi jika tidak ada." },
              tripDays: { type: "integer", description: "Trip length in days, when the user gave a duration." },
              members: {
                type: "array",
                items: {
                  type: "object",
                  required: ["ageGroup"],
                  properties: {
                    ageGroup: { type: "string", enum: ["adult", "elderly", "child", "toddler"] },
                    name: { type: "string" },
                    needs: { type: "array", items: { type: "string", enum: ["wheelchair", "noStairs", "shortWalks", "halal", "vegetarian", "vegan", "nap", "frequentBreaks", "quiet", "noCrowds", "nearToilet"] } },
                    allergies: { type: "string", description: "Food allergies or other allergies" },
                    interests: { 
                      type: "object", 
                      properties: {
                        museum: { type: "string", enum: ["must", "nice"] },
                        shopping: { type: "string", enum: ["must", "nice"] },
                        nature: { type: "string", enum: ["must", "nice"] },
                        food: { type: "string", enum: ["must", "nice"] },
                        themePark: { type: "string", enum: ["must", "nice"] }
                      }
                    }
                  }
                }
              },
              budget: { type: "number", description: "Total budget in exact numerical Rupiah (e.g., 5000000 for 5 million)." },
              pace: { type: "string", enum: ["relaxed", "packed"] },
              extras: {
                type: "object",
                properties: {
                  mustVisit: { type: "string" },
                  avoid: { type: "string" },
                  lodging: { type: "string" }
                }
              }
            }
          }
        },
        required: ["message", "action", "draftPatch"]
      }
    }
  });

  try {
    const reply = JSON.parse(interaction.output_text || "{}");
    const patch = settleTripEnd(reply.draftPatch ?? {}, draft?.startDate, today);
    reply.draftPatch = statedDates ? { ...patch, ...statedDates } : patch;
    return reply;
  } catch (e) {
    const message = locale === "en" ? "Sorry, I lost that one. Could you say it again?" : "Maaf, aku ketinggalan yang barusan. Boleh diulang?";
    return { message, action: "ask", draftPatch: {} };
  }
}

// ============================================================================
// 2. PLANNER & RULE GUARDIAN (Looping Pembuat Itinerary)
// ============================================================================

export async function runTripPlanningFlow(requestBody: any) {
  const { draft, locale } = requestBody;
  console.log("Memulai proses Planner (Parallel API Fetch)...");

  // Single-pass planning to save tokens
  const currentPlan = await plannerAgent(draft, locale);

  
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


  // SEQUENTIAL ENRICHMENT (to prevent API rate limits)
  console.log("Memulai proses sequential enrichment...");
  if (currentPlan.days && Array.isArray(currentPlan.days)) {
    for (const day of currentPlan.days) {
      if (day.items && Array.isArray(day.items)) {
        for (let i = 0; i < day.items.length; i++) {
          const item = day.items[i];
          const arr = day.items;
          try {
            const query = item.title + " " + (draft.destinations?.[0] || "");
            const places = await executeSearchPlaces(query, locale);
            if (places && Array.isArray(places) && places.length > 0) {
              const place = places[0];
              item.imageUrl = place.imageUrl || item.imageUrl;
              item.address = place.address || item.address;
              item.rating = place.rating || item.rating;
              item.priceLevel = place.priceLevel || item.priceLevel;
              item.openingHours = place.open_now !== undefined ? (place.open_now ? (locale === "en" ? "Open Now" : "Buka Sekarang") : (locale === "en" ? "Closed" : "Tutup")) : item.openingHours;
            }
            evaluateRules(item, places?.[0] || null, draft, locale);
            
            // Hitung waktu tempuh ke tempat berikutnya
            if (i < arr.length - 1) {
              const nextItem = arr[i + 1];
              const q1 = item.title + " " + (draft.destinations?.[0] || "");
              const q2 = nextItem.title + " " + (draft.destinations?.[0] || "");
              const t = await executeGetTravelTime(q1, q2, locale);
              if (t.distance && t.duration) {
                item.travelToNext = { distance: t.distance, duration: t.duration };
              }
            }
            
            // Add a small delay to respect API rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch(e) {
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
                      title: { type: "string", description: "Nama tempat yang spesifik" },
                      detail: { type: "string" }
                    },
                    required: ["time", "title", "detail"]
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
  } catch (e) {
    return { days: [] };
  }
}

async function plannerAgent(draft: any, locale: string) {
  return await runAgent(
    `You are a highly efficient and strict Trip Planner. Create a detailed itinerary based on the user's data (dates, destinations, preferences).
CRITICAL RULES to follow:
1. Provide REAL and popular places for titles.
2. The timings MUST be completely logical and realistic. Account for travel times and don't pack too many places if the pace is 'relaxed'.
3. Follow the users' constraints strictly (e.g., budget, dietary needs, accessibility).
Do it perfectly on the first try.`,
    `Please generate a detailed itinerary for:
${JSON.stringify(draft, null, 2)}`,
    locale
  );
}
