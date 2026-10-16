"use client";

import { useEffect } from "react";
import { keepFieldPassOffline } from "@/lib/client/field-pass";
import { keepActiveTripsOffline } from "@/lib/client/keep-trip-offline";
import { useLocale } from "@/lib/use-locale";
import { useOnline } from "@/lib/use-online";

type KeepTripsOfflineProps = { signedIn: boolean };

// Waits for the page being opened to load first: keeping trips is background work and must not slow it down.
const START_DELAY_MS = 3000;

/**
 * Mounted once in the root layout. While someone is signed in and has a connection, it keeps their trips that are
 * under way or coming up on this phone, so a trip opens on the road even if its pages were never opened here.
 * Renders nothing.
 */
export default function KeepTripsOffline({ signedIn }: KeepTripsOfflineProps) {
  const online = useOnline();
  const locale = useLocale();

  useEffect(() => {
    if (!signedIn || !online) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      keepActiveTripsOffline(controller.signal, (tripId) => keepFieldPassOffline(tripId, locale)).catch(() => undefined);
    }, START_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [signedIn, online, locale]);

  return null;
}
