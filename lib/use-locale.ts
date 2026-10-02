import { useSyncExternalStore } from "react";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_STORAGE_KEY as STORAGE_KEY,
  type Locale,
} from "./locale";

// Client-only locale store. Kept apart from ./locale so server code (like the
// root layout) can import the constants without pulling in React hooks.

const listeners = new Set<() => void>();
let current: Locale | null = null;

function getSnapshot(): Locale {
  if (current) return current;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    current = isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    current = DEFAULT_LOCALE;
  }
  return current;
}

function subscribe(listener: () => void) {
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
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_LOCALE);
}

export function setLocale(locale: Locale) {
  current = locale;
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage unavailable: the choice lasts until the page reloads.
  }
  listeners.forEach((listener) => listener());
}
