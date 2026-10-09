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
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#035d60",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
