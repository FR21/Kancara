import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { type ConversationTurn, translateTurn } from "@/lib/agents/translatorAgent";
import { AUDIO_TYPES, LANGUAGE_NAME, MAX_AUDIO_CHARS, MAX_TEXT_CHARS, TRANSLATION_CONTEXTS } from "@/lib/client/translator";
import { isLocale } from "@/lib/locale";
import { rateLimit } from "@/lib/rate-limit";
import { getTripPlan } from "@/lib/trips/store";

export const maxDuration = 30;

const BASE64 = /^[A-Za-z0-9+/]+=*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readAudio(value: unknown): ConversationTurn["audio"] | "invalid" {
  if (value === undefined || value === null) return null;
  if (!isRecord(value) || typeof value.base64 !== "string" || typeof value.mimeType !== "string") return "invalid";
  // "audio/webm;codecs=opus" is sent on as "audio/webm".
  const mimeType = value.mimeType.split(";")[0].trim().toLowerCase();
  if (!AUDIO_TYPES.some((type) => type === mimeType)) return "invalid";
  if (value.base64.length === 0 || value.base64.length > MAX_AUDIO_CHARS || !BASE64.test(value.base64)) return "invalid";
  return { base64: value.base64, mimeType };
}

/** Translates one turn of a conversation: `{ tripId, text | audio, sourceLanguage, targetLanguage, context, locale }`. */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "conversation-translate");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const audio = readAudio(body.audio);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const context = TRANSLATION_CONTEXTS.find((entry) => entry === body.context) ?? "general";
  const { tripId, sourceLanguage, targetLanguage, locale } = body;
  const languagesValid =
    typeof sourceLanguage === "string" && LANGUAGE_NAME.test(sourceLanguage) && typeof targetLanguage === "string" && LANGUAGE_NAME.test(targetLanguage);
  if (audio === "invalid" || typeof tripId !== "string" || !languagesValid || !isLocale(locale)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!audio && (!text || text.length > MAX_TEXT_CHARS)) {
    return NextResponse.json({ error: "Text or a recording is required" }, { status: 400 });
  }

  const plan = await getTripPlan(viewer, tripId);
  if (!plan) return NextResponse.json({ error: "This trip was not found" }, { status: 404 });
  const destinations = plan.card.destinations.length > 0 ? plan.card.destinations : plan.draft.destinations;

  try {
    const result = await translateTurn({
      text,
      audio,
      sourceLanguage,
      targetLanguage,
      destination: destinations.filter(Boolean).join(", "),
      context,
      locale,
    });
    return NextResponse.json(result);
  } catch (caught) {
    console.error("Conversation turn could not be translated", { tripId, error: caught instanceof Error ? caught.message : caught });
    return NextResponse.json({ error: "The sentence could not be translated. Try again." }, { status: 502 });
  }
}
