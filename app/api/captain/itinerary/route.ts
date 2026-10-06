import { NextResponse } from "next/server";
import { runTripPlanningFlow } from "@/lib/agents/tripPlanner";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const itinerary = await runTripPlanningFlow(body);
    return NextResponse.json(itinerary);
  } catch (error: unknown) {
    console.error("Captain Itinerary Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
