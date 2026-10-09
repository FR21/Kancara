// Locale constants, safe to import from server code. The client-side store
// lives in ./use-locale and the per-request reader in ./locale-server. Swap
// them for a real i18n library once the app has translated content.

export const LOCALES = ["id", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "id";

export const LOCALE_NAMES: Record<Locale, string> = {
  id: "Bahasa Indonesia",
  en: "English",
};

export const LOCALE_STORAGE_KEY = "kancara-locale";
/** Cookie that carries the saved choice to the server, so a reload is rendered in that language. */
export const LOCALE_COOKIE = "kancara-locale";
/** Query parameter of a page's language-specific address, as in /about?lang=en. */
export const LOCALE_PARAM = "lang";
/** Request header the middleware sets when the address names a language. */
export const LOCALE_HEADER = "x-kancara-locale";

/** Inline script for <head>. Sets <html lang> from the address or the saved choice before the first paint. */
export const localeInitScript = `(function(){try{var p=new URLSearchParams(location.search).get("${LOCALE_PARAM}");var l=p==="id"||p==="en"?p:localStorage.getItem("${LOCALE_STORAGE_KEY}");if(l==="id"||l==="en")document.documentElement.lang=l}catch(e){}})()`;

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** The address of a page in one language: the plain path for the default language, ?lang= for the others. */
export function localizedPath(path: string, locale: Locale): string {
  return locale === DEFAULT_LOCALE ? path : `${path}?${LOCALE_PARAM}=${locale}`;
}
