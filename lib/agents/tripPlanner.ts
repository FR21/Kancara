/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenAI } from '@google/genai';

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
  const { story, draft, locale, focus } = requestBody;
  console.log("Captain: Memproses pesan user:", story);

  const interaction = await client.interactions.create({
    model: 'gemini-3.5-flash',
    input: `
Pesan pengguna saat ini: "${story}"

Draf perjalanan saat ini (JSON):
${JSON.stringify(draft, null, 2)}
    `,
    system_instruction: `You are an AI travel assistant named Captain Kancara. Today's date is: ${new Date().toISOString().split("T")[0]}.
Your ONLY tasks are:
1. Extract ALL relevant data from the user's message into 'draftPatch'.
IMPORTANT RULES FOR EXTRACTION:
- You are provided with the current draft (Draf perjalanan saat ini).
- ONLY output fields in 'draftPatch' that are known or have changed. OMIT fields if you don't know them yet.
- Do NOT hallucinate data (like dates or budget) just to fill the schema. If you are asking the user for it, do NOT include a guessed value in draftPatch.
- RELATIVE DATES: If the user says "tomorrow", "besok", "next week", etc., you MUST calculate the exact calendar date in YYYY-MM-DD format based on today's date. NEVER output words like "tomorrow".
- If the user mentions "Solo trip" or "sendiri" (alone), ensure there is exactly 1 adult member. If "couple", 2 adult members.
- If the user mentions DURATION (e.g., "for 3 days") but NO start date, assume startDate is TODAY and calculate the exact endDate in YYYY-MM-DD!
- For 'pace': if user says "Packed", "Padat", or "Fast", set to "packed". If "Relaxed", "Santai", or "Slow", set to "relaxed".
- Extract SPECIAL REQUESTS (e.g., museums, cheap hotels, dietary restrictions, avoidances) into 'extras'.
- If budget is mentioned like "5 million", "5 juta", or "5jt", output the full numerical value in Rupiah: 5000000.

2. Reply with a 'message' that is EXTREMELY SHORT, CONCISE, AND TO THE POINT (maximum 1 to 2 sentences).
IMPORTANT RULES FOR REPLY:
- NEVER ask for data that the user has ALREADY provided.
- ONE TOPIC AT A TIME: NEVER ask multiple questions at once.
- STRICT QUESTION ORDER: You must figure out the FIRST missing information from this exact order and ask for it:
  1. destinations (Tujuan)
  2. dates (Tanggal atau Durasi)
  3. members/crew (Siapa saja yang ikut)
  4. budget (Anggaran)
  5. pace (Kecepatan santai/padat)
  6. origin (Kota Asal keberangkatan)
  Do NOT skip this order. If 'dates' is missing, ask for 'dates' before asking for 'members'.
- INTERVIEW THE ORGANIZER: If the user mentions traveling with others (e.g., family, friends), you MUST ask if the other members have any SPECIFIC NEEDS (e.g., wheelchair access, dietary restrictions like halal/vegan, allergies, or need frequent rest).
- If the main data (origin, destinations, dates/duration, budget, members, pace) is complete AND you have captured specific needs/allergies (or the user says there are none), give a cheerful confirmation and provide an option like "Ketik 'Gas' untuk langsung buat jadwalnya!".
- Only ask for missing essential data, DO NOT be verbose.
MANDATORY: You MUST reply to the 'message' in ${locale === "id" ? "Indonesian" : "English"} based on the user's preference.`,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: {
        type: "object",
        properties: {
          message: { type: "string" },
          draftPatch: {
            type: "object",
            properties: {
              origin: { type: "string" },
              destinations: { type: "array", items: { type: "string" } },
              startDate: { type: "string", description: "Format YYYY-MM-DD. Jangan diisi jika tidak ada." },
              endDate: { type: "string", description: "Format YYYY-MM-DD. Jangan diisi jika tidak ada." },
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
        required: ["message", "draftPatch"]
      }
    }
  });

  try {
    const rawOutput = interaction.output_text || "{}";
    console.log("AI Raw Output:", rawOutput);
    return JSON.parse(rawOutput);
  } catch (e) {
    return { message: "Oke, siap! Mari kita atur perjalanannya.", draftPatch: {} };
  }
}

// ============================================================================
// 2. PLANNER & RULE GUARDIAN (Looping Pembuat Itinerary)
// ============================================================================

export async function runTripPlanningFlow(requestBody: any) {
  const { draft, locale } = requestBody;
  console.log("Memulai proses Planner & Guardian (Parallel API Fetch)...");

  let currentPlan = await plannerAgent(draft, locale);
  let isValid = false;
  let iterations = 0;
  const MAX_ITERATIONS = 2;

  while (!isValid && iterations < MAX_ITERATIONS) {
    iterations++;
    const feedback = await ruleGuardianAgent(currentPlan, draft);
    
    if (feedback.startsWith("APPROVE")) {
      console.log("Rule Guardian: Rencana Disetujui!");
      isValid = true;
    } else {
      console.log(`Rule Guardian: Rencana Ditolak (Iterasi ${iterations}). Alasan:`, feedback);
      currentPlan = await plannerAgentRevision(draft, currentPlan, feedback, locale);
    }
  }

  
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


  // PARALLEL ENRICHMENT
  console.log("Memulai proses parallel enrichment...");
  if (currentPlan.days && Array.isArray(currentPlan.days)) {
    for (const day of currentPlan.days) {
      if (day.items && Array.isArray(day.items)) {
        await Promise.all(day.items.map(async (item: any, i: number, arr: any[]) => {
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
          } catch(e) {
            console.error("Gagal memperkaya data untuk", item.title);
          }
        }));
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
        required: ["days"]
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
    `You are a smart Trip Planner. Create an itinerary based on user data (dates, destinations, preferences). Provide REAL and popular places for titles. The itinerary must be realistic regarding travel time and logical ordering.`,
    `Please generate a detailed itinerary for:
${JSON.stringify(draft, null, 2)}`,
    locale
  );
}

async function ruleGuardianAgent(planJson: any, draft: any) {
  const interaction = await client.interactions.create({
    model: 'gemini-3.5-flash-lite',
    input: `Rules: ${JSON.stringify(draft)} | Itinerary: ${JSON.stringify(planJson)}`,
    system_instruction: `You are a Rule Guardian. Check the itinerary: are the timings logical and realistic? If YES, reply strictly with "APPROVE". If NO, state the reason briefly.`
  });
  return interaction.output_text || "APPROVE";
}

async function plannerAgentRevision(draft: any, oldPlan: any, feedback: string, locale: string) {
  return await runAgent(
    `You are an Expert AI Trip Planner. Revise the previous itinerary based on the Guardian\'s feedback. Ensure the timeline is logical and realistic.`,
    `Data:${JSON.stringify(draft)} | Previous:${JSON.stringify(oldPlan)} | Feedback:${feedback}`,
    locale
  );
}
