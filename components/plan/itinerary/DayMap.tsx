"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ItineraryItem } from "@/lib/client/captain";
import {
  CIRCLE_PATH,
  type DayMap as GoogleDayMap,
  type Point,
  type RouteLine,
  type StopMarker,
  googleMapsLink,
  loadDayMap,
  mapsAvailable,
} from "@/lib/itinerary-map";

type DayMapProps = {
  stops: ItineraryItem[];
  destination: string;
  /** The stop the visitor points at in the timeline; its pin grows and comes to the front. */
  activeIndex: number | null;
  labels: { unavailable: string; open: string; loading: string };
  onPick: (index: number) => void;
  className?: string;
};

type MapState = "loading" | "ready" | "failed";

/** A colour from the app's tokens as the map wants it (an rgb string), read off a probe element. */
function tokenColour(token: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}

function isDark(): boolean {
  const forced = document.documentElement.dataset.theme;
  if (forced) return forced === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// The day on a Google map: one numbered pin per stop, in the colours of the timeline, and the line between them in
// the order they are visited. Pointing at a stop in the timeline lifts its pin; tapping a pin opens that stop.
// Without a browser key, or when Google refuses it, the same stops are listed with a link to each in Google Maps.
export default function DayMap({ stops, destination, activeIndex, labels, onPick, className = "" }: DayMapProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  // Each pin with the number of the stop it stands for: a stop the map could not find has no pin.
  const markersRef = useRef<{ marker: StopMarker; index: number }[]>([]);
  const lineRef = useRef<RouteLine | null>(null);
  const [state, setState] = useState<MapState>(mapsAvailable ? "loading" : "failed");
  const stopsKey = stops.map((stop) => stop.placeId ?? stop.address ?? stop.title).join("|");
  const pickRef = useRef(onPick);

  useEffect(() => {
    pickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!mapsAvailable) return;
    let cancelled = false;
    loadDayMap()
      .then(async (maps) => {
        const frame = frameRef.current;
        if (cancelled || !frame) return;
        const map: GoogleDayMap = new maps.Map(frame, {
          center: { lat: -2.5, lng: 118 },
          zoom: 4,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: "cooperative",
          colorScheme: isDark() ? "DARK" : "LIGHT",
        });
        const points = await Promise.all(
          stops.map((stop) =>
            maps.geocode(stop.placeId ? { placeId: stop.placeId } : { address: stop.address ?? `${stop.title}, ${destination}` }),
          ),
        );
        if (cancelled) return;
        const placed = points.flatMap((point, index): { point: Point; index: number }[] => (point ? [{ point, index }] : []));
        if (placed.length === 0) {
          setState("failed");
          return;
        }
        const primary = tokenColour("--primary");
        const onPrimary = tokenColour("--on-primary");
        markersRef.current = placed.map(({ point, index }) => {
          const marker = new maps.Marker({
            position: point,
            map,
            title: stops[index].title,
            zIndex: index,
            icon: { path: CIRCLE_PATH, scale: 14, fillColor: primary, fillOpacity: 1, strokeColor: onPrimary, strokeWeight: 2 },
            label: { text: String(index + 1), color: onPrimary, fontSize: "12px", fontWeight: "700" },
          });
          marker.addListener("click", () => pickRef.current(index));
          return { marker, index };
        });
        lineRef.current = new maps.Polyline({
          path: placed.map(({ point }) => point),
          map,
          strokeColor: primary,
          strokeOpacity: 0.7,
          strokeWeight: 4,
          geodesic: true,
        });
        if (placed.length === 1) {
          map.setCenter(placed[0].point);
          map.setZoom(15);
        } else {
          const bounds = new maps.LatLngBounds();
          placed.forEach(({ point }) => bounds.extend(point));
          map.fitBounds(bounds, 48);
        }
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("failed");
      });
    return () => {
      cancelled = true;
      markersRef.current.forEach(({ marker }) => marker.setMap(null));
      markersRef.current = [];
      lineRef.current?.setMap(null);
      lineRef.current = null;
    };
    // stopsKey stands for the stops: the map is drawn again only when the places themselves change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsKey, destination]);

  // The pin of the stop pointed at grows and comes to the front.
  useEffect(() => {
    if (state !== "ready") return;
    const primary = tokenColour("--primary");
    const accent = tokenColour("--accent");
    const onPrimary = tokenColour("--on-primary");
    const onAccent = tokenColour("--on-accent");
    markersRef.current.forEach(({ marker, index }) => {
      const lifted = index === activeIndex;
      marker.setZIndex(lifted ? 1000 : index);
      marker.setIcon({ path: CIRCLE_PATH, scale: lifted ? 18 : 14, fillColor: lifted ? accent : primary, fillOpacity: 1, strokeColor: onPrimary, strokeWeight: 2 });
      marker.setLabel({ text: String(index + 1), color: lifted ? onAccent : onPrimary, fontSize: lifted ? "14px" : "12px", fontWeight: "700" });
    });
  }, [activeIndex, state]);

  if (state === "failed") {
    return (
      <div className={`rounded-surface border border-border bg-surface p-surface ${className}`}>
        <p className="text-body-sm text-pretty text-text-muted">{labels.unavailable}</p>
        <ol className="mt-4 space-y-2">
          {stops.map((stop, index) => (
            <li key={`${stop.time}-${stop.title}`} className="flex items-center gap-3">
              <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-caption font-bold text-on-primary-subtle tabular-nums">
                {index + 1}
              </span>
              <a
                href={googleMapsLink(stop.address ? `${stop.title}, ${stop.address}` : `${stop.title}, ${destination}`, stop.placeId)}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex min-h-11 min-w-0 items-center gap-2 rounded-sm text-label text-primary underline-offset-4 hover:underline"
              >
                <span className="truncate">{stop.title}</span>
                <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                <span className="sr-only">{labels.open}</span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className={`relative overflow-clip rounded-surface border border-border bg-surface-muted ${className}`}>
      <div ref={frameRef} className="absolute inset-0" />
      {state === "loading" && (
        <p role="status" className="absolute inset-0 flex items-center justify-center text-body-sm text-text-muted motion-safe:animate-pulse">
          {labels.loading}
        </p>
      )}
    </div>
  );
}
