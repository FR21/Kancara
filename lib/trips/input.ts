import "server-only";
import { parseItinerary } from "@/lib/api/captain";
import { contactsOf, MAX_MEMBERS, missingFields, parsePlanDraft, withoutContacts } from "@/lib/plan-draft";
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
 * Reads a plan sent by the browser. A plan without a route, dates, group, budget, or pace is still a draft: it is
 * accepted once it names where the trip goes, which is all its group link needs, and never with an itinerary.
 * Phone numbers are taken out of the plan and handed over beside it.
 */
export async function readTripInput(request: Request): Promise<TripInput | null> {
  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body)) return null;
  const draft = parsePlanDraft(body.draft);
  if (!draft) return null;
  const complete = missingFields(draft).length === 0;
  const itinerary = readItinerary(body.itinerary);
  if (!complete && (itinerary || draft.destinations.length === 0)) return null;

  const input: TripInput = {
    name: typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME_CHARS) : "",
    draft: withoutContacts(draft),
    contacts: contactsOf(draft),
    complete,
    knownMembers: Array.isArray(body.knownMembers)
      ? body.knownMembers.filter((entry): entry is string => typeof entry === "string").slice(0, MAX_MEMBERS)
      : [],
  };
  if (typeof body.violations === "number" && Number.isInteger(body.violations) && body.violations >= 0) {
    input.violations = body.violations;
  }
  if (itinerary) input.itinerary = itinerary;
  return input;
}
