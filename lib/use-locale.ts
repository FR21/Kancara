import { createContext, useContext, useSyncExternalStore } from "react";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_PARAM,
  LOCALE_STORAGE_KEY as STORAGE_KEY,
  type Locale,
} from "./locale";

// Client-only locale store. Kept apart from ./locale so server code (like the
// root layout) can import the constants without pulling in React hooks.

/** The language the server rendered the page in. The root layout provides it. */
export const ServerLocaleContext = createContext<Locale>(DEFAULT_LOCALE);

const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365;
const listeners = new Set<() => void>();
let current: Locale | null = null;
let remembered = false;

function readAddress(): Locale | null {
  const named = new URLSearchParams(window.location.search).get(LOCALE_PARAM);
  return isLocale(named) ? named : null;
}

function readCookie(): Locale | null {
  const saved = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1);
  return isLocale(saved) ? saved : null;
}

// The address comes first: a link to /about?lang=en has to open in English whatever was chosen before.
function getSnapshot(): Locale {
  if (current) return current;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    current = readAddress() ?? (isLocale(stored) ? stored : readCookie()) ?? DEFAULT_LOCALE;
  } catch {
    current = DEFAULT_LOCALE;
  }
  return current;
}

// The cookie is what the server reads, so the next page load is rendered in the same language.
function remember(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage unavailable: the cookie still carries the choice.
  }
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${COOKIE_MAX_AGE_S}; samesite=lax`;
}

function subscribe(listener: () => void) {
  if (!remembered) {
    remembered = true;
    remember(getSnapshot());
  }
  // Keep tabs in sync when the locale changes in another tab.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    current = isLocale(event.newValue) ? event.newValue : DEFAULT_LOCALE;
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLocale(): Locale {
  const rendered = useContext(ServerLocaleContext);
  return useSyncExternalStore(subscribe, getSnapshot, () => rendered);
}

export function setLocale(locale: Locale) {
  current = locale;
  document.documentElement.lang = locale;
  remember(locale);
  // An address that names a language would bring the old one back on reload, so it follows the choice.
  const url = new URL(window.location.href);
  if (url.searchParams.has(LOCALE_PARAM)) {
    if (locale === DEFAULT_LOCALE) url.searchParams.delete(LOCALE_PARAM);
    else url.searchParams.set(LOCALE_PARAM, locale);
    window.history.replaceState(window.history.state, "", url);
  }
  listeners.forEach((listener) => listener());
}
