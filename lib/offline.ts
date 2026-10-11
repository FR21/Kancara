import { type PackingState, parsePacking } from "./plan-draft";

const PENDING_PREFIX = "kancara-packing-pending:";

/**
 * Starts the service worker that keeps opened pages and trips for use without a connection. Only a production
 * build is kept: the dev server's files do not carry the hashed names the worker relies on.
 */
export function registerOfflineSupport() {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => undefined);
}

/** Forgets every page and answer kept for offline use. Called on sign-out, since they belong to that person. */
export async function clearOfflineCaches() {
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
