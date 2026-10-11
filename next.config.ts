import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // The browser looks for a new service worker by fetching it; a cached copy would hide the new one.
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
};

export default nextConfig;
