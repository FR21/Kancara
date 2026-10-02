// Locale constants, safe to import from server code. The client-side store
// lives in ./use-locale. Swap both for a real i18n library once the app has
// translated content.

export const LOCALES = ["id", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "id";

export const LOCALE_NAMES: Record<Locale, string> = {
  id: "Bahasa Indonesia",
  en: "English",
};

export const LOCALE_STORAGE_KEY = "kancara-locale";

/** Inline script for <head>. Sets <html lang> from the saved choice before the first paint. */
export const localeInitScript = `(function(){try{var l=localStorage.getItem("${LOCALE_STORAGE_KEY}");if(l==="id"||l==="en")document.documentElement.lang=l}catch(e){}})()`;

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}
