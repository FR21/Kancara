import { withTimeout } from "@/lib/client/abort";
import type { Locale } from "@/lib/locale";

export type PlacePoint = { name: string; country: string; latitude: number; longitude: number };

const REQUEST_TIMEOUT_MS = 10000;
// Places found in this tab, so typing a destination again does not ask again.
const known = new Map<string, PlacePoint | null>();

function isPoint(value: unknown): value is PlacePoint {
  if (typeof value !== "object" || value === null) return false;
  const point = value as Record<string, unknown>;
  return typeof point.name === "string" && typeof point.latitude === "number" && typeof point.longitude === "number";
}

/** Where each named city is, in order; null where a city cannot be found or the request fails. */
export async function findPlacePoints(names: string[], locale: Locale, signal: AbortSignal): Promise<(PlacePoint | null)[]> {
  const keyOf = (name: string) => `${locale}|${name.trim().toLowerCase()}`;
  const missing = [...new Set(names.filter((name) => !known.has(keyOf(name))))];
  if (missing.length > 0) {
    const query = new URLSearchParams([["lang", locale], ...missing.map((name): [string, string] => ["name", name])]);
    const response = await fetch(`/api/place-points?${query}`, { signal: withTimeout(signal, REQUEST_TIMEOUT_MS) }).catch(() => null);
    const body: unknown = response?.ok ? await response.json().catch(() => null) : null;
    const points = typeof body === "object" && body !== null && Array.isArray((body as { points?: unknown }).points) ? (body as { points: unknown[] }).points : [];
    // A failed request is not remembered, so the next change of the route asks again.
    if (points.length === missing.length) {
      missing.forEach((name, index) => known.set(keyOf(name), isPoint(points[index]) ? points[index] : null));
    }
  }
  return names.map((name) => known.get(keyOf(name)) ?? null);
}
