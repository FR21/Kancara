import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale, LOCALE_COOKIE, LOCALE_HEADER } from "./locale";

/**
 * The language to render this request in: the one the address names
 * (?lang=en, passed on by the middleware), else the visitor's saved choice,
 * else Indonesian.
 */
export async function requestLocale(): Promise<Locale> {
  const named = (await headers()).get(LOCALE_HEADER);
  if (isLocale(named)) return named;
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(saved) ? saved : DEFAULT_LOCALE;
}
