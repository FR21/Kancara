import "server-only";
import type { Metadata } from "next";
import { type Locale, LOCALES, localizedPath } from "./locale";
import { requestLocale } from "./locale-server";
import { MESSAGES, type Messages } from "./messages";

const LOCAL_URL = "http://localhost:3000";
const DEPLOY_HOST = process.env.VERCEL_PROJECT_PRODUCTION_URL;

/** Where the site lives, without a trailing slash. Set NEXT_PUBLIC_SITE_URL in production. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? (DEPLOY_HOST ? `https://${DEPLOY_HOST}` : LOCAL_URL)
).replace(/\/+$/, "");

export type PageKey = keyof Messages["seo"]["pages"];

const OG_LOCALES: Record<Locale, string> = { id: "id_ID", en: "en_US" };

/** The link-preview image for a language: 1200 by 630, with the mascot. */
export function previewImage(locale: Locale) {
  return {
    url: `/images/og/kancara-${locale}.jpg`,
    width: 1200,
    height: 630,
    alt: MESSAGES[locale].seo.imageAlt,
  };
}

/**
 * Title, description, canonical address, language alternates, and link-preview
 * tags for one page in one language. Pages behind the login pass no path: they
 * are kept out of search results and need no alternates.
 */
export function pageMetadata(page: PageKey, locale: Locale, path?: string): Metadata {
  const text = MESSAGES[locale].seo;
  const { title, description } = text.pages[page];
  if (path === undefined) return { title, description, robots: { index: false, follow: false } };

  const isHome = path === "/";
  const fullTitle = isHome ? title : `${title} | ${text.siteName}`;
  const url = localizedPath(path, locale);
  const image = previewImage(locale);
  return {
    title: isHome ? { absolute: title } : title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(LOCALES.map((option) => [option, localizedPath(path, option)])),
        "x-default": path,
      },
    },
    openGraph: {
      type: "website",
      siteName: text.siteName,
      title: fullTitle,
      description,
      url,
      locale: OG_LOCALES[locale],
      alternateLocale: LOCALES.filter((option) => option !== locale).map((option) => OG_LOCALES[option]),
      images: [image],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [image] },
  };
}

/** `pageMetadata` in the language of the current request, for a page's `generateMetadata`. */
export async function requestMetadata(page: PageKey, path?: string): Promise<Metadata> {
  return pageMetadata(page, await requestLocale(), path);
}
