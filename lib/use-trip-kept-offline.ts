import { useEffect, useState } from "react";
import { isTripKept, TRIP_KEPT_EVENT } from "@/lib/client/keep-trip-offline";

/**
 * Whether this phone keeps the trip for use without a connection, read from the caches themselves rather than
 * from the account, since only this phone knows what it keeps. Null until the caches have answered, so nothing is
 * claimed while they are being read. It turns true as soon as the trip is kept in the background.
 */
export function useTripKeptOffline(tripId: string): boolean | null {
  const [kept, setKept] = useState<{ tripId: string; kept: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    const check = () =>
      isTripKept(tripId).then((answer) => {
        if (active) setKept({ tripId, kept: answer });
      });
    const onKept = (event: Event) => {
      if (event instanceof CustomEvent && event.detail === tripId) void check();
    };
    void check();
    window.addEventListener(TRIP_KEPT_EVENT, onKept);
    return () => {
      active = false;
      window.removeEventListener(TRIP_KEPT_EVENT, onKept);
    };
  }, [tripId]);

  // An answer about the trip shown before this one says nothing about this one.
  return kept?.tripId === tripId ? kept.kept : null;
}
