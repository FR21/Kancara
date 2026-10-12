import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { Member } from "@/lib/plan-draft";

const client = new GoogleGenAI({});
const MODEL = "gemini-3.5-flash-lite";

export type MemberDietCheck = {
  memberId: string;
  memberName: string;
  status: "safe" | "warning" | "danger";
  reason: string;
};

export type WaiterInquiry = {
  language: string;
  nativePhrase: string;
  romanized: string;
  translation: string;
};

export type DietaryAnalysisResult = {
  dishOrItemName: string;
  originalLanguage: string;
  detectedIngredients: string[];
  hiddenOrDoubtfulIngredients: string[];
  overallSuitability: "safe" | "warning" | "danger";
  summary: string;
  memberChecks: MemberDietCheck[];
  waiterInquiry: WaiterInquiry;
};

const SYSTEM_INSTRUCTION = `You are Kancara's expert Dietary Lens & On-the-Ground Food Safety Companion.
Your mission is to read foreign-language restaurant menus, food labels, or ingredient lists from photos and evaluate their suitability for traveling group members who have strict dietary restrictions or severe allergies.

Rules:
1. Thoroughly transcribe the dish name or main product from the image.
2. Identify all visible and likely hidden ingredients (e.g. lard/pork extract, mirin, sake, cooking alcohol, animal gelatin, dashi fish stock, nuts, sesame, shellfishes, gluten).
3. Evaluate EACH member against their restrictions:
   - "safe": No problematic ingredients found or suspected.
   - "warning": Potential hidden ingredients or cross-contamination risk that requires confirmation with the waiter/staff.
   - "danger": Confirmed or highly likely to contain an ingredient violating their dietary requirements or triggering allergies.
4. "waiterInquiry": MUST be tailored specifically to the destination country/city where the trip is taking place:
   - Identify the primary local spoken language of the destination (e.g., Japanese for Tokyo/Kyoto/Japan, Korean for Seoul/Korea, Thai for Bangkok/Phuket/Thailand, French for Paris/France, Italian for Rome/Italy, Mandarin for Taiwan/China/Singapore, Spanish for Spain/Mexico, Arabic for Middle East, English for UK/USA/Australia, Indonesian/Malay for Indonesia/Malaysia).
   - "language": Name of that destination's local language.
   - "nativePhrase": A polite, culturally natural phrase inquiring directly about the group's exact restrictions/suspicions, written in the native script (e.g. Japanese Kanji/Hiragana, Korean Hangul, Thai script, etc.).
   - "romanized": Exact pronunciation guide in Latin alphabet (e.g. Romaji/Pinyin/Romanization).
   - "translation": Translation of the phrase strictly in the requested output language (Indonesian if locale is "id", English if locale is "en").
5. ALL explanation fields ("dishOrItemName", "detectedIngredients", "hiddenOrDoubtfulIngredients", "summary", and member "reason") MUST be written strictly and 100% in the requested user language:
   - If user language is "id" (Indonesian): EVERYTHING except the local waiter phrase MUST be in proper Indonesian.
   - If user language is "en" (English): EVERYTHING except the local waiter phrase MUST be in proper English.
   Do NOT mix languages!`;

export async function analyzeMenuImage(
  imageBase64: string,
  mimeType: string,
  members: Member[],
  destinationCountryOrCity?: string,
  locale: string = "id"
): Promise<DietaryAnalysisResult> {
  const isEn = locale === "en";
  const memberConstraints = members.map((m) => ({
    id: m.id,
    name: m.name,
    dietNeeds: m.needs.filter((n) => ["halal", "vegetarian", "vegan"].includes(n)),
    customNeeds: m.customNeeds,
    allergies: m.allergies,
  }));

  const prompt = `Analyze this food menu/item picture for this traveling group:
Current Trip Destination / Location: ${destinationCountryOrCity || "International / Unknown"}
Members & Dietary Constraints:
${JSON.stringify(memberConstraints, null, 2)}

TARGET OUTPUT LANGUAGE RULE:
The user interface language is: ${isEn ? "ENGLISH (en)" : "INDONESIAN (id)"}.
ALL generated descriptions, detected ingredient names, summary, member evaluation reasons, and the translation of the waiter phrase MUST be written STRICTLY in ${isEn ? "ENGLISH" : "INDONESIAN"}.

WAITER INQUIRY RULE:
The waiter question MUST be generated in the local native language appropriate for the destination "${destinationCountryOrCity || "the location"}":
- If the trip is in Indonesia (e.g. Bali, Lombok, Yogyakarta, Jakarta, Bandung, Labuan Bajo, or anywhere in Indonesia):
  * "language": "Indonesian"
  * "nativePhrase": Polite natural Indonesian asking the waiter (e.g. "Permisi, apakah menu ini mengandung minyak babi, kaldu daging, atau bahan alergen seperti kacang?")
  * "romanized": Same as the nativePhrase
  * "translation": Same as nativePhrase (or English if user locale is en)
- If the trip is abroad (e.g. Japan, South Korea, Thailand, China, France, Italy, Spain, etc.):
  * "language": Name of that destination's native language (e.g. "Japanese", "Korean", "Thai")
  * "nativePhrase": Written in native characters
  * "romanized": Pronunciation guide in Latin alphabet
  * "translation": Clear translation in ${isEn ? "English" : "Indonesian"}`;

  const response = await client.interactions.create({
    model: MODEL,
    system_instruction: SYSTEM_INSTRUCTION,
    input: [
      {
        type: "image",
        mime_type: mimeType,
        data: imageBase64,
      },
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
          dishOrItemName: { type: "string" },
          originalLanguage: { type: "string" },
          detectedIngredients: { type: "array", items: { type: "string" } },
          hiddenOrDoubtfulIngredients: { type: "array", items: { type: "string" } },
          overallSuitability: { type: "string", enum: ["safe", "warning", "danger"] },
          summary: { type: "string" },
          memberChecks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                memberId: { type: "string" },
                memberName: { type: "string" },
                status: { type: "string", enum: ["safe", "warning", "danger"] },
                reason: { type: "string" },
              },
              required: ["memberId", "memberName", "status", "reason"],
            },
          },
          waiterInquiry: {
            type: "object",
            properties: {
              language: { type: "string" },
              nativePhrase: { type: "string" },
              romanized: { type: "string" },
              translation: { type: "string" },
            },
            required: ["language", "nativePhrase", "romanized", "translation"],
          },
        },
        required: [
          "dishOrItemName",
          "detectedIngredients",
          "overallSuitability",
          "summary",
          "memberChecks",
          "waiterInquiry",
        ],
      },
    },
  });

  try {
    const parsed = JSON.parse(response.output_text || "{}");
    return parsed;
  } catch (error) {
    console.error("Failed to parse DietaryAnalysisResult:", error, response.output_text);
    throw new Error("Gagal menganalisis menu makanan.");
  }
}
