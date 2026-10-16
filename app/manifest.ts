import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE } from "@/lib/locale";
import { MESSAGES } from "@/lib/messages";

export default function manifest(): MetadataRoute.Manifest {
  const text = MESSAGES[DEFAULT_LOCALE].seo;
  return {
    name: text.pages.home.title,
    short_name: text.siteName,
    description: text.description,
    lang: DEFAULT_LOCALE,
    // One id for the installed app wherever it starts, so changing where it opens never installs it twice.
    id: "/",
    scope: "/",
    // Opened from the home screen, the app is there for the trips, and their list is kept for use offline.
    start_url: "/trips",
    display: "standalone",
    // A manifest has one background colour, with no dark variant, so the splash screen stays light.
    background_color: "#ffffff",
    theme_color: "#035d60",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
