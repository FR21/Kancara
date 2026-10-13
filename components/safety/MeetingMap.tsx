"use client";

import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Messages } from "@/lib/messages";
import type { Coordinates } from "@/lib/safety/contact";
import { type GoogleMap, loadMaps } from "@/lib/safety/google-map";

type MeetingMapProps = {
  /** Where the map opens: the meeting point as it stands, when it has a position. */
  start: Coordinates | null;
  /** The trip's first destination, looked up to open the map near it when there is no position yet. */
  near: string;
  /** A position to bring under the pin, such as the phone's own once it was read. */
  moveTo: Coordinates | null;
  text: Messages["safety"]["meeting"];
  /** Told the point under the pin each time the visitor has moved the map. */
  onMove: (point: Coordinates) => void;
  /** Told when the map cannot be shown, so the form goes on with the phone's own position alone. */
  onUnavailable: () => void;
};

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const PLACE_ZOOM = 17;
const CITY_ZOOM = 13;
// Where the map opens when nothing says where the trip is: all of Indonesia.
const FALLBACK = { point: { lat: -2.5, lng: 118 }, zoom: 4 };

/** The middle of a named place, tried as written and then by its last part ("Glodok, Jakarta" is found as "Jakarta"). */
async function lookUp(name: string, signal: AbortSignal): Promise<Coordinates | null> {
  const tries = [...new Set([name, name.split(",").pop() ?? ""].map((entry) => entry.trim()).filter(Boolean))];
  for (const entry of tries) {
    try {
      const query = new URLSearchParams({ name: entry, count: "1", format: "json" });
      const data = (await (await fetch(`${GEOCODE_URL}?${query}`, { signal })).json()) as { results?: { latitude?: unknown; longitude?: unknown }[] };
      const found = data.results?.[0];
      if (typeof found?.latitude === "number" && typeof found.longitude === "number") return { latitude: found.latitude, longitude: found.longitude };
    } catch {
      // The next spelling is tried; with none found the map opens wide.
    }
  }
  return null;
}

// A map with a pin fixed at its middle: the visitor slides the map under the pin instead of aiming a tap, which
// works with a thumb and needs no precision. The point is theirs, not a place looked up from Google, so it is
// kept with the meeting point like a position read from the phone.
export default function MeetingMap({ start, near, moveTo, text, onMove, onUnavailable }: MeetingMapProps) {
  const holderRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const [ready, setReady] = useState(false);
  // The handlers the map calls outlive a render, so they read the latest callbacks from here.
  const callbacksRef = useRef({ onMove, onUnavailable });
  useEffect(() => {
    callbacksRef.current = { onMove, onUnavailable };
  });

  useEffect(() => {
    const controller = new AbortController();
    const open = async () => {
      try {
        const [library, looked] = await Promise.all([loadMaps(), start || !near ? null : lookUp(near, controller.signal)]);
        if (controller.signal.aborted || !holderRef.current) return;
        const origin = start ?? looked;
        const map = new library.Map(holderRef.current, {
          center: origin ? { lat: origin.latitude, lng: origin.longitude } : FALLBACK.point,
          zoom: start ? PLACE_ZOOM : looked ? CITY_ZOOM : FALLBACK.zoom,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          colorScheme: document.documentElement.dataset.theme === "dark" ? "DARK" : "LIGHT",
        });
        const report = () => {
          const center = map.getCenter();
          if (center) callbacksRef.current.onMove({ latitude: center.lat(), longitude: center.lng() });
        };
        map.addListener("dragend", report);
        map.addListener("zoom_changed", report);
        mapRef.current = map;
        setReady(true);
      } catch {
        if (!controller.signal.aborted) callbacksRef.current.onUnavailable();
      }
    };
    open();
    return () => controller.abort();
    // The map opens once, where the form found the meeting point when it was opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !moveTo) return;
    mapRef.current?.setCenter({ lat: moveTo.latitude, lng: moveTo.longitude });
    mapRef.current?.setZoom(PLACE_ZOOM);
  }, [ready, moveTo]);

  return (
    <div>
      <div className="relative h-64 overflow-clip rounded-2xl border border-border-strong bg-surface-muted">
        <div ref={holderRef} role="application" aria-label={text.mapLabel} className="size-full" />
        {!ready && (
          <p role="status" className="absolute inset-0 flex items-center justify-center text-body-sm text-text-muted motion-safe:animate-pulse">
            {text.mapLoading}
          </p>
        )}
        {/* The pin's tip, not its middle, marks the point: it is lifted by its own height. */}
        {ready && (
          <MapPin
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-full fill-primary text-on-primary drop-shadow-md"
          />
        )}
      </div>
      <p className="mt-2 text-caption text-pretty text-text-muted">{text.mapHint}</p>
    </div>
  );
}
