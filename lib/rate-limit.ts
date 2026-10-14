import "server-only";

const WINDOW_MS = 1000;
const MAX_REQUESTS = 3;
const MAX_TRACKED_KEYS = 5000;

// One list of recent request times per client and API. It lives in memory, so
// the limit is per server process; a shared store is needed once the app runs
// on more than one instance. It hangs off globalThis so a hot reload keeps it.
type RateGlobal = typeof globalThis & { kancaraRateHits?: Map<string, number[]> };
const globalStore = globalThis as RateGlobal;
const hitsByKey = (globalStore.kancaraRateHits ??= new Map<string, number[]>());

function clientOf(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

function forgetIdleClients(now: number): void {
  if (hitsByKey.size < MAX_TRACKED_KEYS) return;
  hitsByKey.forEach((hits, key) => {
    if (hits.every((time) => now - time >= WINDOW_MS)) hitsByKey.delete(key);
  });
}

/**
 * Allows each client three requests a second to one API (or `perSecond` where a page needs more at once, such as
 * the photos of a day's stops). Returns a 429 response to send back when the client is over the limit, otherwise null.
 */
export function rateLimit(request: Request, api: string, perSecond = MAX_REQUESTS): Response | null {
  const now = Date.now();
  const key = `${api}:${clientOf(request)}`;
  const recent = (hitsByKey.get(key) ?? []).filter((time) => now - time < WINDOW_MS);

  if (recent.length >= perSecond) {
    hitsByKey.set(key, recent);
    return Response.json(
      { error: "Too many requests. Try again in a moment." },
      { status: 429, headers: { "Retry-After": "1" } },
    );
  }

  recent.push(now);
  hitsByKey.set(key, recent);
  forgetIdleClients(now);
  return null;
}
