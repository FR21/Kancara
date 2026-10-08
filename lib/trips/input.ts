import "server-only";
import { parseItinerary } from "@/lib/api/captain";
import { missingFields, parsePlanDraft } from "@/lib/plan-draft";
import type { TripInput } from "./store";

const MAX_NAME_CHARS = 120;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readItinerary(value: unknown): TripInput["itinerary"] {
  try {
    return parseItinerary(value);
  } catch {
    return undefined;
  }
}

/**
 * Reads a plan sent by the browser. Only a complete draft is accepted: a trip
 * without a route, dates, group, budget, or pace is still a draft.
 */
export async function readTripInput(request: Request): Promise<TripInput | null> {
  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body)) return null;
  const draft = parsePlanDraft(body.draft);
  if (!draft || missingFields(draft).length > 0) return null;

  const input: TripInput = {
    name: typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME_CHARS) : "",
    draft,
  };
  if (typeof body.violations === "number" && Number.isInteger(body.violations) && body.violations >= 0) {
    input.violations = body.violations;
  }
  const itinerary = readItinerary(body.itinerary);
  if (itinerary) input.itinerary = itinerary;
  return input;
}
