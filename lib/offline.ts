import { PUSH_SCOPE } from "@/lib/client/push";
import { type PackingState, parsePacking } from "./plan-draft";

const PENDING_PREFIX = "kancara-packing-pending:";

/**
 * Starts the service worker that keeps opened pages and trips for use without a connection. Serwist builds it
 * from app/sw.ts, and only in a production build: the dev server's files do not carry the hashed names the
 * worker relies on.
 */
export function registerOfflineSupport() {
  if (!("serviceWorker" in navigator)) return;
  if (process.env.NODE_ENV !== "production") {
    // A worker left on this address by a production run would hand the dev server's pages that build's scripts
    // and styles, so edits would never show. It is removed, with everything it kept.
    navigator.serviceWorker
      .getRegistrations()
      // The worker that receives push notifications has a scope of its own and no pages to go stale; it stays.
      .then((found) => Promise.all(found.filter((entry) => !entry.scope.endsWith(PUSH_SCOPE)).map((entry) => entry.unregister())))
      .then(clearOfflineCaches)
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
  try {
    navigator.serviceWorker?.controller?.postMessage("clear");
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
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
