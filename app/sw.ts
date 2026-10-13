import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from "serwist";

// Kancara's service worker, built by Serwist into public/sw.js. It keeps the app's own files ahead of time and
// whatever the visitor has opened, so a trip's pages, its packing list, and its help page still open without a
// connection. Pages and API answers are fetched fresh when they can be and served from the last copy when they
// cannot. Push notifications have a worker of their own (public/push-sw.js).

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const OFFLINE_PAGE = "/offline";
const DAY_SECONDS = 86_400;
// A trip is opened at home and read on the road, days later and often with no connection in between. Serwist's
// own rules forget a page after a day, so pages and answers are kept under these instead.
const KEPT_DAYS = 30;
const keptFor = (maxEntries: number) => new ExpirationPlugin({ maxEntries, maxAgeSeconds: KEPT_DAYS * DAY_SECONDS, maxAgeFrom: "last-used" });

const tripCaching: RuntimeCaching[] = [
  {
    // Signing in and out is never answered from a copy.
    matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/api/auth/"),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/api/"),
    method: "GET",
    handler: new NetworkFirst({ cacheName: "kancara-data", plugins: [keptFor(120)], networkTimeoutSeconds: 10 }),
  },
  {
    matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
    handler: new NetworkFirst({ cacheName: "kancara-pages", plugins: [keptFor(80)] }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...tripCaching, ...defaultCache],
});

// Reached when a rule above could not answer. Cache storage can be missing or refuse to open (a private window, a
// full disk), and the site must still load then, so the network is tried once more by itself. With no connection
// either, a page that was never kept is sent on to the offline page instead of being handed its HTML under the
// wrong address, which the app would try to make sense of and fail on.
serwist.setCatchHandler(async ({ request }) => {
  try {
    return await fetch(request);
  } catch {
    // No connection: what follows answers without one.
  }
  if (request.mode !== "navigate") return Response.error();
  if (new URL(request.url).pathname !== OFFLINE_PAGE) return Response.redirect(OFFLINE_PAGE, 302);
  return (await serwist.matchPrecache(OFFLINE_PAGE)) ?? Response.error();
});

// Signing out asks the worker to forget what was kept for that person: their pages and answers. The app's own
// files, kept ahead of time, belong to nobody and stay.
self.addEventListener("message", (event) => {
  if (event.data !== "clear") return;
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => !key.includes("precache")).map((key) => caches.delete(key)))));
});

// What the worker written by hand before this one kept is under names nothing reads anymore.
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("kancara-offline-")).map((key) => caches.delete(key)))));
});

serwist.addEventListeners();
