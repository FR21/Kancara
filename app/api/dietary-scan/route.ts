import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { analyzeMenuImage } from "@/lib/agents/dietaryAgent";
import type { Member } from "@/lib/plan-draft";
import { getTripPlan } from "@/lib/trips/store";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 45; // Mengizinkan waktu pemrosesan AI Vision

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "dietary-scan");
  if (limited) return limited;

  try {
    const viewer = await currentViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const tripId = formData.get("tripId") as string | null;
    const file = formData.get("image") as File | null;
    const locale = (formData.get("locale") as string | null) || "id";

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Ambil anggota rombongan dan destinasi dari trip
    let members: Member[] = [];
    let destination = "";

    if (tripId) {
      const plan = await getTripPlan(viewer, tripId);
      if (plan) {
        members = plan.draft.members || [];
        destination = plan.card.destinations.join(", ") || "";
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    const analysis = await analyzeMenuImage(base64, mimeType, members, destination, locale);

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("Dietary scan error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze dietary menu" },
      { status: 500 }
    );
  }
}
