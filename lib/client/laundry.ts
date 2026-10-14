import { withTimeout } from "@/lib/client/abort";
import type { Itinerary } from "@/lib/client/captain";
import { type LaundryCopy, type LaundryPlace, type LaundryPlaces, laundryLookups, planLaundry } from "@/lib/laundry";
import type { Locale } from "@/lib/locale";
import type { PlanDraft } from "@/lib/plan-draft";

const REQUEST_TIMEOUT_MS = 15000;
const RATE_LIMIT_WAIT_MS = 1100;

function parsePlace(value: unknown): LaundryPlace | null {
  if (typeof value !== "object" || value === null) return null;
  const { title, address, rating } = value as Record<string, unknown>;
  if (typeof title !== "string" || title.trim() === "") return null;
  return {
    title,
    address: typeof address === "string" ? address : undefined,
    rating: typeof rating === "number" ? rating : undefined,
  };
}

/** A laundry close to a place, or null when none is known there. Throws when the lookup itself fails. */
async function fetchLaundryPlace(
  near: string,
  locale: Locale,
  signal: AbortSignal,
  retried = false,
): Promise<LaundryPlace | null> {
  const query = new URLSearchParams({ near, lang: locale });
  const response = await fetch(`/api/laundry?${query}`, { signal: withTimeout(signal, REQUEST_TIMEOUT_MS) });
  // Every API allows three requests a second; one busy moment is waited out, not shown as a failure.
  if (response.status === 429 && !retried) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
    return fetchLaundryPlace(near, locale, signal, true);
  }
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Laundry request failed with ${response.status}`);
  return parsePlace(await response.json());
}

/**
 * The itinerary with the group's laundry choice worked in, looking a laundry up for every drop-off the choice
 * needs. Throws when a lookup fails, so the caller can try again once there is a connection.
 */
export async function settleLaundry(
  draft: PlanDraft,
  itinerary: Itinerary,
  copy: LaundryCopy,
  locale: Locale,
  signal: AbortSignal,
): Promise<Itinerary> {
  const found = new Map<string, LaundryPlace | null>();
  const places: LaundryPlaces = {};
  for (const { date, near } of laundryLookups(draft, itinerary)) {
    // Drop-offs beside the same lodging share one lookup.
    if (!found.has(near)) found.set(near, near === "" ? null : await fetchLaundryPlace(near, locale, signal));
    places[date] = found.get(near) ?? null;
  }
  return planLaundry(draft, itinerary, copy, places);
}
