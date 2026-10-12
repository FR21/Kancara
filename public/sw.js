// Kancara's service worker: keeps what the visitor has already opened, so a trip's pages and its packing list
// still open without a connection. Built files are kept by their hashed names; pages and API answers are
// fetched fresh when they can be and served from the last copy when they cannot.
const VERSION = "kancara-offline-2";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const DATA_CACHE = `${VERSION}-data`;
const OFFLINE_PAGE = "/offline";

// The offline page is kept ahead of time, with the scripts and styles its HTML names, so it can run on a device
// that never opened it. If that fails the worker still installs and keeps what it can later.
async function keepOfflinePage() {
  const response = await fetch(OFFLINE_PAGE);
  if (!response.ok) return;
  const pages = await caches.open(PAGE_CACHE);
  await pages.put(OFFLINE_PAGE, response.clone());
  const files = [...new Set((await response.text()).match(/\/_next\/static\/[^"'\\\s<>]+\.(?:js|css)/g) ?? [])];
  const statics = await caches.open(STATIC_CACHE);
  await Promise.all(files.map((file) => statics.add(file).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    keepOfflinePage()
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Signing out asks the worker to forget everything, since the copies belong to the person who signed in.
self.addEventListener("message", (event) => {
  if (event.data !== "clear") return;
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const kept = await cache.match(request);
  if (kept) return kept;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

// A page never kept is sent on to the offline page rather than handed its HTML under the wrong address, which
// the app would try to make sense of and fail on.
async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const kept = await cache.match(request);
    if (kept) return kept;
    if (!fallbackUrl) throw error;
    // The offline page is kept under its plain address; asked for with a query, it is served all the same.
    if (new URL(request.url).pathname === fallbackUrl) {
      const offline = await cache.match(fallbackUrl);
      if (offline) return offline;
      throw error;
    }
    return Response.redirect(fallbackUrl, 302);
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/auth/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGE_CACHE, OFFLINE_PAGE));
  } else if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, DATA_CACHE));
  } else {
    event.respondWith(networkFirst(request, STATIC_CACHE));
  }
});
