import type { Locale } from "@/lib/locale";

// The languages the people met on a trip can speak. `englishName` is what the model reads, `nativeName` what the
// language calls itself (shown beside the name in the reader's language), and `places` the destinations that
// make it the first guess.

export const LOCAL_LANGUAGES = [
  { key: "english", tag: "en-US", englishName: "English", nativeName: "English", places: ["singapore", "singapura", "uk", "united kingdom", "london", "england", "inggris", "usa", "america", "amerika", "new york", "australia", "sydney", "melbourne", "new zealand", "selandia baru"] },
  { key: "japanese", tag: "ja-JP", englishName: "Japanese", nativeName: "日本語", places: ["japan", "jepang", "tokyo", "osaka", "kyoto", "sapporo", "fukuoka", "hokkaido", "okinawa", "nagoya", "hiroshima", "nara"] },
  { key: "korean", tag: "ko-KR", englishName: "Korean", nativeName: "한국어", places: ["korea", "korea selatan", "south korea", "seoul", "busan", "jeju", "incheon", "daegu"] },
  { key: "thai", tag: "th-TH", englishName: "Thai", nativeName: "ภาษาไทย", places: ["thailand", "bangkok", "phuket", "chiang mai", "pattaya", "krabi"] },
  { key: "chinese", tag: "zh-CN", englishName: "Mandarin Chinese", nativeName: "中文", places: ["china", "cina", "tiongkok", "beijing", "shanghai", "taiwan", "taipei", "guangzhou", "shenzhen"] },
  { key: "cantonese", tag: "zh-HK", englishName: "Cantonese", nativeName: "廣東話", places: ["hong kong", "hongkong", "macau", "makau"] },
  { key: "vietnamese", tag: "vi-VN", englishName: "Vietnamese", nativeName: "Tiếng Việt", places: ["vietnam", "hanoi", "da nang", "danang", "saigon", "ho chi minh", "hoi an"] },
  { key: "malay", tag: "ms-MY", englishName: "Malay", nativeName: "Bahasa Melayu", places: ["malaysia", "kuala lumpur", "penang", "johor", "malaka", "melaka", "brunei"] },
  { key: "arabic", tag: "ar-SA", englishName: "Arabic", nativeName: "العربية", places: ["arab", "saudi", "arab saudi", "saudi arabia", "dubai", "uae", "abu dhabi", "makkah", "mecca", "mekah", "madinah", "medina", "qatar", "doha", "riyadh", "jeddah", "mesir", "egypt", "cairo", "kairo"] },
  { key: "turkish", tag: "tr-TR", englishName: "Turkish", nativeName: "Türkçe", places: ["turkey", "turki", "turkiye", "istanbul", "cappadocia", "antalya"] },
  { key: "french", tag: "fr-FR", englishName: "French", nativeName: "Français", places: ["france", "prancis", "paris", "nice", "lyon", "marseille"] },
  { key: "german", tag: "de-DE", englishName: "German", nativeName: "Deutsch", places: ["germany", "jerman", "berlin", "munich", "munchen", "frankfurt", "austria", "vienna", "wina"] },
  { key: "italian", tag: "it-IT", englishName: "Italian", nativeName: "Italiano", places: ["italy", "italia", "rome", "roma", "milan", "milano", "florence", "venice", "venesia"] },
  { key: "spanish", tag: "es-ES", englishName: "Spanish", nativeName: "Español", places: ["spain", "spanyol", "madrid", "barcelona", "seville", "mexico", "meksiko"] },
  { key: "dutch", tag: "nl-NL", englishName: "Dutch", nativeName: "Nederlands", places: ["netherlands", "belanda", "amsterdam", "rotterdam"] },
  { key: "indonesian", tag: "id-ID", englishName: "Indonesian", nativeName: "Bahasa Indonesia", places: ["indonesia", "bali", "jogja", "yogyakarta", "jakarta", "bandung", "lombok", "labuan bajo", "medan", "surabaya", "malang", "semarang", "makassar", "bukittinggi", "danau toba", "raja ampat"] },
] as const;

export type LocalLanguage = (typeof LOCAL_LANGUAGES)[number];
export type LanguageKey = LocalLanguage["key"];

/** The traveler speaks the language they read the app in. */
export function travelerLanguage(locale: Locale): LocalLanguage {
  return languageByKey(locale === "en" ? "english" : "indonesian");
}

export function languageByKey(key: string): LocalLanguage {
  return LOCAL_LANGUAGES.find((language) => language.key === key) ?? LOCAL_LANGUAGES[0];
}

/**
 * The language most people at the destination speak. Places are matched as whole words, so "uk" is not found in
 * "Fukuoka" or "Bukittinggi". At home, a traveler who reads Indonesian talks to visitors in English.
 */
export function guessLocalLanguage(destination: string, locale: Locale): LocalLanguage {
  const words = ` ${destination.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean).join(" ")} `;
  const found = LOCAL_LANGUAGES.find((language) => language.places.some((place) => words.includes(` ${place} `)));
  const traveler = travelerLanguage(locale);
  if (!found || found.key === traveler.key) return languageByKey(traveler.key === "english" ? "indonesian" : "english");
  return found;
}
