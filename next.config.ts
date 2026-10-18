import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

// Serwist builds the service worker (app/sw.ts) into public/sw.js. It works through webpack, so the production
// build runs with `next build --webpack`; the dev server keeps Turbopack and has no worker.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  // The worker is started by lib/offline.ts, which also removes a leftover one on the dev server.
  register: false,
  // Coming back online must not reload the page: a request for help made offline is being sent at that moment.
  reloadOnOnline: false,
  // The offline page is kept ahead of time, under a mark that changes with every build so a new build replaces it.
  additionalPrecacheEntries: [{ url: "/offline", revision: randomUUID() }],
  // Nothing from the public folder is kept ahead of time: its photographs would cost megabytes of a phone's data
  // on the first visit. They are kept as they are seen instead.
  globPublicPatterns: [],
});

const nextConfig: NextConfig = {
  output: "standalone",
  // Serwist adds a webpack setting even while it is switched off. Next refuses to run Turbopack beside a webpack
  // setting unless Turbopack has one of its own, so this empty one says the dev server is meant to use it.
  turbopack: {},
  images: {
    formats: ["image/avif", "image/webp"],
    // No 3840 width: no picture on these pages is worth sending at 4K, and the widest source is 2000px anyway.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560],
    // 75 is the default for every picture; 50 is for the darkened backgrounds.
    qualities: [50, 75],
  },
  async headers() {
    // The browser looks for a new service worker by fetching it; a cached copy would hide the new one.
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
};

export default withSerwist(nextConfig);
