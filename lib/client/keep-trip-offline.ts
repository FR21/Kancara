import { trips } from "@/lib/client/trips";
import { DATA_CACHE, PAGE_CACHE } from "@/lib/offline-caches";

const READ_TIMEOUT_MS = 15_000;
const RATE_LIMIT_WAIT_MS = 1100;
// Each trip asks the same APIs again, which allow three requests a second; trips are kept one after another, this
// far apart, so keeping them never takes the room the page being read needs.
const BETWEEN_TRIPS_MS = 1100;
// Kept trips are kept again once a day, so a change made elsewhere reaches the copy before the road.
const KEPT_KEY = "kancara-kept-trips";
/** Raised on the window when a trip has just been kept, with the trip's id, so a badge can say so at once. */
export const TRIP_KEPT_EVENT = "kancara-trip-kept";

const tripPath = (tripId: string) => `/trips/${encodeURIComponent(tripId)}`;

/** The pages a trip is read through on the road. */
function tripPages(tripId: string): string[] {
  const trip = tripPath(tripId);
  return [trip, `${trip}/today`, `${trip}/help`, `${trip}/packing`, `${trip}/dietary-scan`, `${trip}/translator`, `${trip}/summary`];
}

/** The answers those pages read: the trip itself and its help pack. */
function tripData(tripId: string): string[] {
  const api = `/api/trips/${encodeURIComponent(tripId)}`;
  return [api, `${api}/safety`];
}

async function fetchOk(url: string, retried = false): Promise<Response | null> {
  const response = await fetch(url, { signal: AbortSignal.timeout(READ_TIMEOUT_MS) });
  // One busy moment is waited out, as everywhere else the app asks.
  if (response.status === 429 && !retried) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
    return fetchOk(url, true);
  }
  // A page that sent the request elsewhere, such as to sign in, would be kept under the wrong address.
  if (!response.ok || response.redirected) return null;
  return response;
}

/** Fetches each address and puts the answer in the cache. True when every one was kept. */
export async function keepUrls(cacheName: string, urls: string[]): Promise<boolean> {
  const cache = await caches.open(cacheName);
  const kept = await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetchOk(url);
        if (!response) return false;
        await cache.put(url, response);
        return true;
      } catch {
        return false;
      }
    }),
  );
  return kept.every(Boolean);
}

/**
 * Puts a trip's pages and answers where the service worker finds them without a connection. The worker keeps what
 * is opened anyway; this also covers the pages nobody has opened on this phone yet, and a browser where the worker
 * is not running. False when the browser keeps nothing or a part could not be fetched.
 */
export async function keepTripOffline(tripId: string): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  try {
    const [data, pages] = await Promise.all([keepUrls(DATA_CACHE, tripData(tripId)), keepUrls(PAGE_CACHE, tripPages(tripId))]);
    const kept = data && pages;
    if (kept) window.dispatchEvent(new CustomEvent(TRIP_KEPT_EVENT, { detail: tripId }));
    return kept;
  } catch {
    return false;
  }
}

/** Whether this phone keeps every page and answer of the trip, so it opens without a connection. */
export async function isTripKept(tripId: string): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  try {
    const [pages, data] = await Promise.all([caches.open(PAGE_CACHE), caches.open(DATA_CACHE)]);
    const found = await Promise.all([
      ...tripPages(tripId).map((url) => pages.match(url)),
      ...tripData(tripId).map((url) => data.match(url)),
    ]);
    return found.every((response) => response !== undefined);
  } catch {
    return false;
  }
}

type KeptDays = Record<string, string>;

function readKeptDays(): KeptDays {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEPT_KEY) ?? "null");
    if (typeof stored !== "object" || stored === null || Array.isArray(stored)) return {};
    return Object.fromEntries(Object.entries(stored).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch {
    return {};
  }
}

function writeKeptDays(days: KeptDays) {
  try {
    localStorage.setItem(KEPT_KEY, JSON.stringify(days));
  } catch {
    // Storage unavailable: the trips are kept again on the next visit, which costs a little data and nothing else.
  }
}

/**
 * Keeps every trip that is under way or coming up, each at most once a day, so the trip opens on the road even
 * when its pages were never opened on this phone. `keepTrip` is what keeping one trip means to the caller, such
 * as the trip and its field pass in the reader's language. Stops at the first sign the connection is gone.
 */
export async function keepActiveTripsOffline(
  signal: AbortSignal,
  keepTrip: (tripId: string) => Promise<boolean> = keepTripOffline,
): Promise<void> {
  if (typeof caches === "undefined") return;
  const active = await trips.active(signal);
  const today = new Date().toDateString();
  const tripIds = [...active.ongoing, ...active.upcoming].map((trip) => trip.id);
  // Trips that are over, or gone, are forgotten here so the record never grows.
  const keptDays = Object.fromEntries(Object.entries(readKeptDays()).filter(([tripId]) => tripIds.includes(tripId)));
  const due = tripIds.filter((tripId) => keptDays[tripId] !== today);
  // The trips list is where the app opens from the home screen, so it is kept beside the trips.
  if (due.length > 0) await keepUrls(PAGE_CACHE, ["/trips"]);

  for (const tripId of due) {
    if (signal.aborted || !navigator.onLine) break;
    // A trip that could not be kept in full is tried again on the next visit, not tomorrow.
    if (await keepTrip(tripId)) keptDays[tripId] = today;
    writeKeptDays(keptDays);
    await new Promise((resolve) => setTimeout(resolve, BETWEEN_TRIPS_MS));
  }
  writeKeptDays(keptDays);
}
