import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { FieldPassData } from "@/lib/field-pass";

const client = new GoogleGenAI({});
const MODEL = "gemini-3.5-flash-lite";

const SYSTEM_INSTRUCTION = `You are Kancara's Global Safety & Destination Intelligence Agent (F-16 Field Pass Generator).
Your task is to generate complete, hyper-localized, on-the-ground travel companion data for ANY country or city in the world.

CRITICAL LOCALIZATION & SAFETY PRINCIPLES:
1. Destination Accuracy:
   - Identify the exact country, official/primary spoken language, and corresponding BCP-47 tag (e.g. ja-JP for Japan, ko-KR for Korea, th-TH for Thailand, vi-VN for Vietnam, de-CH for Switzerland, tr-TR for Turkey, is-IS for Iceland, ar-MA for Morocco, fr-FR for France, etc.).
2. Emergency Hotlines:
   - Provide the EXACT local police and ambulance emergency numbers for that specific country/territory (e.g. Switzerland is Police 117 & Ambulance 144; Vietnam is Police 113 & Ambulance 115; Japan is Police 110 & Ambulance 119; USA/Canada is 911; EU is 112; Turkey is 155/112).
   - Find the NEAREST Indonesian Diplomatic Mission (KBRI - Kedutaan Besar Republik Indonesia, or KJRI - Konsulat Jenderal Republik Indonesia) for that city/region with their emergency hotline and city. (For example, Osaka has KJRI Osaka; Tokyo has KBRI Tokyo; Bern/Zurich has KBRI Bern; Hanoi has KBRI Hanoi; Ho Chi Minh City has KJRI HCMC; Melbourne has KJRI Melbourne; Sydney has KJRI Sydney).
3. Dietary Restaurant Passport:
   - Formulate a polite, clear, high-contrast message in the LOCAL NATIVE SCRIPT for restaurant servers (e.g. Kanji/Hiragana in Japan, Hangul in Korea, Thai script in Thailand, Arabic in Middle East, Cyrillic in Eastern Europe, Vietnamese in Vietnam).
   - Clearly state the party size, specific food restrictions (e.g. Halal/No Pork/No Alcohol, Peanut/Nut Allergy, Vegetarian, Vegan, Gluten-free, Seafood, etc.), and ask the staff to verify ingredients.
   - If the local script is non-Latin, provide phonetic romanization.
4. Essential Taxi & Field Phrases:
   - Provide 4 practical phrases:
     a) Minta Bon / Tagihan (Bill/Check)
     b) Di mana toilet? (Where is the restroom?)
     c) Tolong antar ke alamat ini (Take me to this address)
     d) Tolong bantu kami / Darurat! (Emergency help!)
   - Written in local script + phonetic pronunciation in Latin.
5. User Language:
   - Explanations and labels must be in Indonesian if locale is 'id', or English if locale is 'en'.`;

export async function generateFieldPassWithAI({
  tripId,
  tripName,
  destination,
  memberCount,
  needs = [],
  customNeeds = [],
  lodgingText,
  locale = "id",
}: {
  tripId: string;
  tripName: string;
  destination: string;
  memberCount: number;
  needs?: string[];
  customNeeds?: string[];
  lodgingText?: string;
  locale?: string;
}): Promise<FieldPassData> {
  const isEn = locale === "en";
  const count = Math.max(1, memberCount);
  const dietaryRestrictions = [...needs, ...customNeeds].filter(Boolean);

  const prompt = `Generate a comprehensive Field Pass for this trip:
- Destination City/Region: "${destination || "International"}"
- Trip Title: "${tripName || destination}"
- Group Size: ${count} traveler(s)
- Dietary Restrictions / Allergies: ${dietaryRestrictions.length > 0 ? dietaryRestrictions.join(", ") : "None (General hygienic safe food)"}
- Lodging / Hotel Notes: "${lodgingText || destination + " Downtown Hotel"}"
- UI Language: ${isEn ? "English" : "Indonesian"}

Return precise JSON with accurate local emergency numbers, nearest Indonesian diplomatic post (KBRI/KJRI), local scripts, and field phrases.`;

  const response = await client.interactions.create({
    model: MODEL,
    system_instruction: SYSTEM_INSTRUCTION,
    input: [
      {
        type: "text",
        text: prompt,
      },
    ],
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: {
        type: "object",
        properties: {
          countryName: { type: "string" },
          destinationFlag: { type: "string" },
          languageName: { type: "string" },
          langTag: { type: "string" },
          accommodation: {
            type: "object",
            properties: {
              name: { type: "string" },
              address: { type: "string" },
              localName: { type: "string" },
              localAddress: { type: "string" },
            },
            required: ["name", "address"],
          },
          dietary: {
            type: "object",
            properties: {
              dietBadges: { type: "array", items: { type: "string" } },
              localScriptText: { type: "string" },
              romanized: { type: "string" },
              explanation: { type: "string" },
            },
            required: ["dietBadges", "localScriptText", "explanation"],
          },
          phrases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                category: { type: "string", enum: ["dining", "transport", "emergency", "directions"] },
                label: { type: "string" },
                localText: { type: "string" },
                romanized: { type: "string" },
              },
              required: ["id", "category", "label", "localText", "romanized"],
            },
          },
          emergency: {
            type: "object",
            properties: {
              police: { type: "string" },
              ambulance: { type: "string" },
              embassyName: { type: "string" },
              embassyPhone: { type: "string" },
              embassyAddress: { type: "string" },
            },
            required: ["police", "ambulance", "embassyName", "embassyPhone"],
          },
        },
        required: [
          "countryName",
          "destinationFlag",
          "langTag",
          "accommodation",
          "dietary",
          "phrases",
          "emergency",
        ],
      },
    },
  });

  try {
    const raw = JSON.parse(response.output_text || "{}");

    return {
      tripId,
      tripName: tripName || `Trip to ${destination}`,
      destination,
      destinationFlag: raw.destinationFlag || "🌐",
      countryName: raw.countryName || destination,
      langTag: raw.langTag || "en-US",
      accommodation: {
        name: raw.accommodation?.name || lodgingText || `${destination} Central Hotel`,
        address: raw.accommodation?.address || `${destination} Downtown Area`,
        localName: raw.accommodation?.localName,
        localAddress: raw.accommodation?.localAddress,
        langTag: raw.langTag || "en-US",
      },
      dietary: {
        memberCount: count,
        dietBadges: raw.dietary?.dietBadges || ["Umum"],
        localScriptText: raw.dietary?.localScriptText || "Please check dietary suitability.",
        romanized: raw.dietary?.romanized,
        explanationId: isEn ? "" : raw.dietary?.explanation || "",
        explanationEn: isEn ? raw.dietary?.explanation || "" : "",
        langTag: raw.langTag || "en-US",
      },
      phrases: (raw.phrases || []).map((p: any) => ({
        id: p.id || "phrase",
        category: p.category || "dining",
        labelId: p.label || "",
        labelEn: p.label || "",
        localText: p.localText || "",
        romanized: p.romanized || "",
        langTag: raw.langTag || "en-US",
      })),
      emergency: {
        police: raw.emergency?.police || "112",
        ambulance: raw.emergency?.ambulance || "112",
        embassyName: raw.emergency?.embassyName || "Perwakilan RI / Kemlu Hotline",
        embassyPhone: raw.emergency?.embassyPhone || "+62-812-9007-007",
        embassyAddress: raw.emergency?.embassyAddress || "Portal Peduli WNI: peduliwni.kemlu.go.id",
      },
      downloadedAt: null,
    };
  } catch (err) {
    console.error("Failed to parse AI Field Pass:", err, response.output_text);
    throw new Error("Gagal menghasilkan Field Pass dengan AI.");
  }
}
