import { withTimeout } from "@/lib/client/abort";
import type { Locale } from "@/lib/locale";

// The conversation translator's requests: one sentence, typed or spoken, from one side of a conversation into the
// other side's language.

export const TRANSLATION_CONTEXTS = ["general", "restaurant", "shopping", "transit", "emergency"] as const;
export type TranslationContext = (typeof TRANSLATION_CONTEXTS)[number];

/** Recording types the server passes on to the model. Browsers name their recordings with these, plus codecs. */
export const AUDIO_TYPES = ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav", "audio/aac"] as const;
/** The largest recording sent, as base64 characters (about 3 MB of sound, far more than a sentence needs). */
export const MAX_AUDIO_CHARS = 4_000_000;
export const MAX_TEXT_CHARS = 1000;
/** A language name the model reads, in English: letters and spaces only. */
export const LANGUAGE_NAME = /^[A-Za-z ]{2,40}$/;

export type TranslationRequest = {
  tripId: string;
  /** What was typed, or what the browser heard when it could listen by itself. */
  text?: string;
  /** A recording, for browsers that cannot turn speech into text by themselves. */
  audio?: { base64: string; mimeType: string };
  /** English names of the languages, as the model reads them. */
  sourceLanguage: string;
  targetLanguage: string;
  context: TranslationContext;
  locale: Locale;
};

export type TranslationResult = {
  /** What was said, as the model heard or read it. */
  originalText: string;
  translatedText: string;
  /** Latin pronunciation of the translation, the same text when it is already in Latin letters. */
  romanized: string;
  politenessLevel: string;
  culturalTip: string;
};

export type TranslationFailure = "offline" | "failed";

export class TranslationError extends Error {
  constructor(readonly reason: TranslationFailure) {
    super(`Translation failed: ${reason}`);
  }
}

const REQUEST_TIMEOUT_MS = 35_000;
const RATE_LIMIT_WAIT_MS = 1100;
const MAX_RESULT_CHARS = 2000;

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_RESULT_CHARS) : "";
}

/** A translation from the model or the network, or null when it holds no translated text. */
export function parseTranslation(value: unknown): TranslationResult | null {
  if (typeof value !== "object" || value === null) return null;
  const record: Record<string, unknown> = { ...value };
  const translatedText = readText(record.translatedText);
  if (!translatedText) return null;
  return {
    originalText: readText(record.originalText),
    translatedText,
    romanized: readText(record.romanized),
    politenessLevel: readText(record.politenessLevel),
    culturalTip: readText(record.culturalTip),
  };
}

export async function translate(request: TranslationRequest, signal: AbortSignal, retried = false): Promise<TranslationResult> {
  let response: Response;
  try {
    response = await fetch("/api/conversation-translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: withTimeout(signal, REQUEST_TIMEOUT_MS),
    });
  } catch (caught) {
    if (signal.aborted) throw caught;
    throw new TranslationError(navigator.onLine ? "failed" : "offline");
  }
  // Every API allows three requests a second; one busy moment is waited out, not shown as a failure.
  if (response.status === 429 && !retried) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
    return translate(request, signal, true);
  }
  if (!response.ok) throw new TranslationError("failed");
  const result = parseTranslation(await response.json());
  if (!result) throw new TranslationError("failed");
  return result;
}

/** A recording as base64, the way it travels in JSON. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      resolve(dataUrl.slice(dataUrl.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
