import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { generateFieldPassWithAI } from "@/lib/agents/fieldPassAgent";
import { rateLimit } from "@/lib/rate-limit";
import { getTripPlan } from "@/lib/trips/store";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "field-pass-generate");
  if (limited) return limited;

  try {
    const viewer = await currentViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      tripId,
      tripName: initialTripName,
      destination: initialDestination,
      memberCount: initialMemberCount,
      needs: initialNeeds,
      customNeeds: initialCustomNeeds,
      lodgingText: initialLodgingText,
      locale = "id",
    } = body;

    let destination = initialDestination || "";
    let tripName = initialTripName || "";
    let memberCount = initialMemberCount || 1;
    let needs = initialNeeds || [];
    let customNeeds = initialCustomNeeds || [];
    let lodgingText = initialLodgingText || "";

    if (tripId) {
      const plan = await getTripPlan(viewer, tripId);
      if (plan) {
        destination =
          destination ||
          plan.card.destinations.filter(Boolean).join(", ") ||
          plan.draft.destinations.filter(Boolean).join(", ") ||
          plan.card.name ||
          "";
        tripName = tripName || plan.card.name;
        memberCount = memberCount || plan.card.memberCount || 1;
        needs = needs.length > 0 ? needs : plan.card.needs || [];
        customNeeds = customNeeds.length > 0 ? customNeeds : plan.card.customNeeds || [];
        lodgingText = lodgingText || plan.draft.extras?.lodging || "";
      }
    }

    if (!destination.trim()) {
      return NextResponse.json({ error: "Destination is required" }, { status: 400 });
    }

    const result = await generateFieldPassWithAI({
      tripId: tripId || "quick-pass",
      tripName,
      destination,
      memberCount,
      needs,
      customNeeds,
      lodgingText,
      locale,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Field pass generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate Field Pass" },
      { status: 500 }
    );
  }
}
