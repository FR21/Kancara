import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";
import { DATA_CACHE, IMAGE_CACHE, isPersonalCache, PAGE_CACHE, PHOTO_CACHE } from "../lib/offline-caches";

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
// Two rules fill the pages cache, and one plugin keeps its count for both.
// Each trip kept for offline takes seven pages (overview, today, help, packing, menu scan, translator, recap), so
// this holds about thirty trips besides the pages opened along the way.
const pagesKept = keptFor(240);
// A slow connection on the road is worse than none: past this wait the last copy of the page is shown instead.
const PAGE_TIMEOUT_SECONDS = 4;
// Pages that are opened with a different query each time, such as the help page with ?member=, but read the same.
const ONE_COPY_PAGES = /^\/trips\/[^/]+\/(help|today)$/;
// A memory's photo never changes under its address, and a place photo barely does, so a kept one is shown at once.
const PHOTO_PATHS = /^\/api\/place-photo$|^\/api\/trips\/[^/]+\/memories\/[^/]+\/photo$/;

const tripCaching: RuntimeCaching[] = [
  {
    // Signing in and out is never answered from a copy.
    matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/api/auth/"),
    handler: new NetworkOnly(),
  },
  {
    // A search for a lost member, or a stranger's word that they found one, is only worth reading as it is now. An
    // old copy would show a search that is over, or hide one that has started.
    matcher: ({ sameOrigin, url }) =>
      sameOrigin && (url.pathname === "/api/safety/alerts" || url.pathname.startsWith("/api/finder/")),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ sameOrigin, url }) => sameOrigin && PHOTO_PATHS.test(url.pathname),
    method: "GET",
    handler: new CacheFirst({ cacheName: PHOTO_CACHE, plugins: [keptFor(150)] }),
  },
  {
    matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/api/"),
    method: "GET",
    handler: new NetworkFirst({ cacheName: DATA_CACHE, plugins: [keptFor(200)], networkTimeoutSeconds: 10 }),
  },
  {
    matcher: ({ request, sameOrigin, url }) => sameOrigin && request.mode === "navigate" && ONE_COPY_PAGES.test(url.pathname),
    handler: new NetworkFirst({
      cacheName: PAGE_CACHE,
      plugins: [pagesKept],
      networkTimeoutSeconds: PAGE_TIMEOUT_SECONDS,
      matchOptions: { ignoreSearch: true },
    }),
  },
  {
    matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
    handler: new NetworkFirst({ cacheName: PAGE_CACHE, plugins: [pagesKept], networkTimeoutSeconds: PAGE_TIMEOUT_SECONDS }),
  },
  {
    // Serwist's own rule forgets a resized image after a day; a trip's pictures are wanted for its whole length.
    matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname === "/_next/image",
    handler: new StaleWhileRevalidate({ cacheName: IMAGE_CACHE, plugins: [keptFor(64)] }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // The offline page is opened with the address it stands in for (?from=), and is still the one kept ahead of time.
  precacheOptions: { ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^from$/] },
  runtimeCaching: [...tripCaching, ...defaultCache],
});

// Reached when a rule above could not answer. Cache storage can be missing or refuse to open (a private window, a
// full disk), and the site must still load then, so the network is tried once more by itself. With no connection
// either, a page that was never kept is sent on to the offline page instead of being handed its HTML under the
// wrong address, which the app would try to make sense of and fail on. The address it was meant for goes along, so
// the offline page's Retry can open that page again rather than itself.
serwist.setCatchHandler(async ({ request }) => {
  try {
    return await fetch(request);
  } catch {
    // No connection: what follows answers without one.
  }
  if (request.mode !== "navigate") return Response.error();
  const url = new URL(request.url);
  if (url.pathname !== OFFLINE_PAGE) {
    return Response.redirect(`${OFFLINE_PAGE}?from=${encodeURIComponent(url.pathname + url.search)}`, 302);
  }
  return (await serwist.matchPrecache(OFFLINE_PAGE)) ?? Response.error();
});

// Signing out asks the worker to forget what was kept for that person: their pages and answers. The app's own
// files, kept ahead of time, belong to nobody and stay.
self.addEventListener("message", (event) => {
  if (event.data !== "clear") return;
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter(isPersonalCache).map((key) => caches.delete(key)))));
});

// What the worker written by hand before this one kept is under names nothing reads anymore.
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("kancara-offline-")).map((key) => caches.delete(key)))));
});

serwist.addEventListeners();
