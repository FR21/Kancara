import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Pages behind the login and the API hold nothing a search result should point at.
const PRIVATE_PATHS = ["/api/", "/trips", "/profile", "/plan"];

// Crawlers that feed AI search and AI assistants. They are named on purpose: Kancara wants to be read and quoted
// by them, and a rule of their own makes that explicit instead of leaving it to the catch-all.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE_PATHS },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
