import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { translateConversation } from "@/lib/agents/translatorAgent";
import { getTripPlan } from "@/lib/trips/store";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "conversation-translate");
  if (limited) return limited;

  try {
    const viewer = await currentViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { text, audioBase64, audioMimeType, sourceLanguage, targetLanguage, tripId, context, locale } = body;

    if (!audioBase64 && (!text || typeof text !== "string" || !text.trim())) {
      return NextResponse.json({ error: "Text or audio is required" }, { status: 400 });
    }

    let destination = "";
    if (tripId) {
      const plan = await getTripPlan(viewer, tripId);
      if (plan) {
        destination =
          plan.card.destinations.filter(Boolean).join(", ") ||
          plan.draft.destinations.filter(Boolean).join(", ") ||
          plan.card.name ||
          "";
      }
    }

    const result = await translateConversation({
      text: text?.trim(),
      audioBase64,
      audioMimeType,
      sourceLanguage: sourceLanguage || "Indonesian",
      targetLanguage: targetLanguage || "Japanese",
      destination,
      context: context || "general",
      locale: locale || "id",
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Conversation translation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to translate conversation" },
      { status: 500 }
    );
  }
}
