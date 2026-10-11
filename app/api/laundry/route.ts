import { type NextRequest, NextResponse } from "next/server";
import { executeSearchPlaces } from "@/lib/agents/tripPlanner";
import { isLocale } from "@/lib/locale";
import { rateLimit } from "@/lib/rate-limit";

const MAX_NEAR_CHARS = 200;

/**
 * A laundry close to a place: `?near=Hotel Santika, Bandung`. Answers 404 when none is found, and the stop then
 * goes into the itinerary without a name.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "laundry");
  if (limited) return limited;

  const params = request.nextUrl.searchParams;
  const near = params.get("near")?.trim() ?? "";
  if (near === "" || near.length > MAX_NEAR_CHARS) {
    return NextResponse.json({ error: "Invalid place" }, { status: 400 });
  }

  const language = params.get("lang");
  const places: unknown[] = await executeSearchPlaces(`laundry service near ${near}`, isLocale(language) ? language : "id");
  const place = places[0];
  if (typeof place !== "object" || place === null || !("name" in place) || typeof place.name !== "string") {
    return NextResponse.json({ error: "No laundry found" }, { status: 404 });
  }
  return NextResponse.json({
    title: place.name,
    address: "address" in place && typeof place.address === "string" ? place.address : undefined,
    rating: "rating" in place && typeof place.rating === "number" ? place.rating : undefined,
  });
}
