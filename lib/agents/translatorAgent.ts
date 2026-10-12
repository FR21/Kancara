import "server-only";
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({});
const MODEL = "gemini-3.5-flash-lite";

export type TranslationResult = {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  romanized: string;
  politenessLevel: string;
  culturalTip: string;
};

const SYSTEM_INSTRUCTION = `You are Kancara's Real-time Travel Conversation Interpreter (F-14 On-the-ground Spoken Companion).
Your job is to translate spoken two-way conversations between travelers and locals (restaurant servers, train/taxi staff, shopkeepers, officials, hotel receptionists).

CRITICAL TRANSLATION PRINCIPLES:
1. Natural Spoken Cadence: Translate for real human speech, not robotic literal translation.
2. Politeness & Cultural Etiquette:
   - When translating to the local language (e.g. Japanese, Korean, Thai, French): Use culturally appropriate polite forms (e.g., Keigo in Japanese, Jondaetmal in Korean, polite particles 'khrap'/'kha' in Thai) suitable for addressing service staff or officials.
   - When translating back to the traveler's language (Indonesian or English): Keep the tone clear, natural, and friendly.
3. Romanization:
   - If the target language uses non-Latin script (Japanese Kanji/Hiragana/Katakana, Korean Hangul, Thai, Mandarin Hanzi, Arabic, Russian Cyrillic), provide clear Latin pronunciation (Romaji, Revised Romanization, RTGS, Pinyin).
   - If target language already uses Latin alphabet, 'romanized' should match 'translatedText'.
4. Cultural Tip:
   - Provide a 1-sentence quick tip about gestures, etiquette, or context if helpful (e.g., "Ucapkan sambil sedikit membungkuk untuk sopan santun di Jepang.").
5. Output Language Consistency:
   - 'culturalTip' and 'politenessLevel' MUST be in the traveler's UI language (Indonesian if locale is "id", English if locale is "en").`;

export async function translateConversation({
  text,
  audioBase64,
  audioMimeType = "audio/webm",
  sourceLanguage,
  targetLanguage,
  destination,
  context = "general",
  locale = "id",
}: {
  text?: string;
  audioBase64?: string;
  audioMimeType?: string;
  sourceLanguage: string;
  targetLanguage: string;
  destination?: string;
  context?: string;
  locale?: string;
}): Promise<TranslationResult> {
  const isEn = locale === "en";

  const prompt = audioBase64
    ? `Listen carefully to the spoken voice in this audio recording:
1. Transcribe the exact words spoken into 'originalText' (in the spoken language).
2. Translate it accurately and politely into target language: ${targetLanguage}.
Expected Speaker Language: ${sourceLanguage}
Target Translation Language: ${targetLanguage}
Trip Destination / Country: ${destination || "International"}
Context of situation: ${context}
Traveler UI Language: ${isEn ? "English" : "Indonesian"}

Produce a natural, culturally polite translation for spoken conversation.`
    : `Translate this spoken dialogue for a traveler on the ground:
Speaker Statement: "${text || ""}"
From Language: ${sourceLanguage}
To Target Language: ${targetLanguage}
Trip Destination / Country: ${destination || "International"}
Context of situation: ${context}
Traveler UI Language: ${isEn ? "English" : "Indonesian"}

Produce a natural, culturally polite translation for spoken conversation.`;

  const inputParts: any[] = [];
  if (audioBase64) {
    inputParts.push({
      type: "audio",
      mime_type: audioMimeType,
      data: audioBase64,
    });
  }
  inputParts.push({
    type: "text",
    text: prompt,
  });

  const response = await client.interactions.create({
    model: MODEL,
    system_instruction: SYSTEM_INSTRUCTION,
    input: inputParts,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: {
        type: "object",
        properties: {
          originalText: { type: "string" },
          translatedText: { type: "string" },
          sourceLanguage: { type: "string" },
          targetLanguage: { type: "string" },
          romanized: { type: "string" },
          politenessLevel: { type: "string" },
          culturalTip: { type: "string" },
        },
        required: [
          "originalText",
          "translatedText",
          "sourceLanguage",
          "targetLanguage",
          "romanized",
          "politenessLevel",
          "culturalTip",
        ],
      },
    },
  });

  try {
    const parsed = JSON.parse(response.output_text || "{}");
    return parsed;
  } catch (error) {
    console.error("Failed to parse TranslationResult:", error, response.output_text);
    throw new Error(isEn ? "Failed to translate conversation." : "Gagal menerjemahkan percakapan.");
  }
}
