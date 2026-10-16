import { useSyncExternalStore } from "react";

// The trip under way, as last heard from the server. The SOS button is drawn from it while there is no connection,
// which is when a separated member needs it most and when the server cannot be asked.
const KEY = "kancara-ongoing-trip";
const CHANGE_EVENT = "kancara-ongoing-trip-change";

function subscribe(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) notify();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, notify);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, notify);
  };
}

function readKept(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** The id of the trip under way that this phone last heard of, or null. Null while rendering on the server. */
export function useKeptOngoingTrip(): string | null {
  return useSyncExternalStore(subscribe, readKept, () => null);
}

/** Remembers the trip under way, or forgets it when there is none (null). */
export function keepOngoingTrip(tripId: string | null) {
  if (readKept() === tripId) return;
  try {
    if (tripId === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, tripId);
  } catch {
    // Storage unavailable: the button shows while the server can be asked, as before.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
