import { type Itinerary, parseItinerary } from "@/lib/client/captain";
import { PUSH_SCOPE } from "@/lib/client/push";
import { isPersonalCache } from "@/lib/offline-caches";
import { type PackingState, parsePacking } from "./plan-draft";

const PENDING_PREFIX = "kancara-packing-pending:";
const PENDING_ITINERARY_PREFIX = "kancara-itinerary-pending:";

/**
 * Starts the service worker that keeps opened pages and trips for use without a connection. Serwist builds it
 * from app/sw.ts, and only in a production build: the dev server's files do not carry the hashed names the
 * worker relies on.
 */
export function registerOfflineSupport() {
  if (!("serviceWorker" in navigator)) return;
  if (process.env.NODE_ENV !== "production") {
    // A worker left on this address by a production run would hand the dev server's pages that build's scripts
    // and styles, so edits would never show. It is removed, with the pages and answers it kept. What was typed
    // into this browser (plan drafts, packing changes not sent yet) stays: a reload must not throw it away.
    navigator.serviceWorker
      .getRegistrations()
      // The worker that receives push notifications has a scope of its own and no pages to go stale; it stays.
      .then((found) => Promise.all(found.filter((entry) => !entry.scope.endsWith(PUSH_SCOPE)).map((entry) => entry.unregister())))
      .then(clearKeptPages)
      .catch(() => undefined);
    return;
  }
  navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => undefined);
}

// What this device keeps for itself rather than for the person signed in: the language and the theme.
const DEVICE_KEYS = ["kancara-locale", "kancara-theme"];

/**
 * Forgets every page and answer kept for offline use, and everything the app stored in this browser for the
 * person (plan drafts with health notes, help packs with phone numbers, saved profiles, split bills). Called on
 * sign-out, since all of it belongs to that person; the language and the theme stay with the device.
 */
export async function clearOfflineCaches() {
  try {
    Object.keys(localStorage)
      .filter((key) => /^kancara[-_]/.test(key) && !DEVICE_KEYS.includes(key))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // No storage here: nothing was kept.
  }
  await clearKeptPages();
}

/**
 * Forgets the pages, answers, and photos kept for the person. The precache stays: it holds the app's own files
 * and the offline page, which belong to nobody, and without it nothing could be shown with no connection.
 */
async function clearKeptPages() {
  try {
    navigator.serviceWorker?.controller?.postMessage("clear");
    const keys = await caches.keys();
    await Promise.all(keys.filter(isPersonalCache).map((key) => caches.delete(key)));
  } catch {
    // No cache storage here: nothing was kept, so nothing has to go.
  }
}

/** Packing changes made on this device that have not reached the server yet. */
export function readPendingPacking(tripId: string): PackingState | null {
  try {
    const raw = localStorage.getItem(PENDING_PREFIX + tripId);
    return raw === null ? null : parsePacking(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writePendingPacking(tripId: string, packing: PackingState) {
  try {
    localStorage.setItem(PENDING_PREFIX + tripId, JSON.stringify(packing));
  } catch {
    // Storage unavailable: the change lasts until the page is closed, and is sent as soon as it can be.
  }
}

export function clearPendingPacking(tripId: string) {
  try {
    localStorage.removeItem(PENDING_PREFIX + tripId);
  } catch {
    // Nothing was kept.
  }
}

/** An itinerary changed on this device (a stop switched to a backup) that has not reached the server yet. */
export function readPendingItinerary(tripId: string): Itinerary | null {
  try {
    const raw = localStorage.getItem(PENDING_ITINERARY_PREFIX + tripId);
    return raw === null ? null : parseItinerary(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writePendingItinerary(tripId: string, itinerary: Itinerary) {
  try {
    localStorage.setItem(PENDING_ITINERARY_PREFIX + tripId, JSON.stringify(itinerary));
  } catch {
    // Storage unavailable: the change lasts until the page is closed, and is sent as soon as it can be.
  }
}

export function clearPendingItinerary(tripId: string) {
  try {
    localStorage.removeItem(PENDING_ITINERARY_PREFIX + tripId);
  } catch {
    // Nothing was kept.
  }
}
