import type { MetadataRoute } from "next";
import { LOCALES, localizedPath } from "@/lib/locale";
import { SITE_URL } from "@/lib/seo";

// The pages meant to be found through search, each with its address in every language.
const PAGES = [
  { path: "/", priority: 1 },
  { path: "/about", priority: 0.8 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly",
    priority,
    alternates: {
      languages: Object.fromEntries(LOCALES.map((locale) => [locale, `${SITE_URL}${localizedPath(path, locale)}`])),
    },
  }));
}
