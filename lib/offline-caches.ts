// The names of the caches the service worker (app/sw.ts) keeps for use without a connection. The app reads and
// fills the same caches (lib/client/keep-trip-offline.ts) and empties them on sign-out (lib/offline.ts), so the
// names live in one place that both sides import.

/** Pages that were opened or kept ahead of a trip. */
export const PAGE_CACHE = "kancara-pages";
/** Answers of the app's own API: trips, packing lists, help packs, field passes. */
export const DATA_CACHE = "kancara-data";
/** Place and memory photos, apart from the data so a day of photos never pushes a trip's answers out. */
export const PHOTO_CACHE = "kancara-photos";
/** Images resized by Next's image route. */
export const IMAGE_CACHE = "kancara-images";

// Caches that hold only the app's own build files, shared by everyone who opens the site. Serwist's precache,
// which carries the offline page, is one of them and is matched by its name containing "precache".
const SHARED_CACHES = [
  "google-fonts-webfonts",
  "google-fonts-stylesheets",
  "static-font-assets",
  "next-static-js-assets",
  "static-js-assets",
  "static-style-assets",
];

/**
 * Whether a cache can hold something of the person signed in: a page, an answer, a photo. Everything not known to
 * hold only build files counts, so a cache added later is emptied on sign-out rather than left behind.
 */
export function isPersonalCache(name: string): boolean {
  return !name.includes("precache") && !SHARED_CACHES.includes(name);
}
