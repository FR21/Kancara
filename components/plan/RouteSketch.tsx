"use client";

import { type GeoPermissibleObjects, geoCircle, geoNaturalEarth1, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { type CSSProperties, useEffect, useId, useState } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { type PlacePoint, findPlacePoints } from "@/lib/client/place-points";
import type { Locale } from "@/lib/locale";
import { fillTemplate } from "@/lib/plan-draft";

type RouteSketchProps = {
  origin: string;
  destinations: string[];
  locale: Locale;
  /** "Route: {route}", read instead of the drawing. */
  label: string;
  compact?: boolean;
};

const WIDTH = 480;
const HEIGHT = 315;
const MARGIN = 40;
/** How long the origin field waits after the last key before the sketch looks the city up. */
const TYPING_PAUSE_MS = 700;
/** A lone city is shown with this many degrees of the world around it. */
const LONE_RADIUS = 6;
const SEGMENT_DELAY_MS = 350;

let landLoading: Promise<Feature<Geometry> | FeatureCollection<Geometry>> | null = null;

function loadLand() {
  landLoading ??= import("world-atlas/land-110m.json").then((atlas) => {
    const topology = atlas.default as unknown as Topology<{ land: GeometryCollection }>;
    return feature(topology, topology.objects.land);
  });
  return landLoading;
}

// The trip drawn as it is being planned: the cities on a world map, the way between them as a dotted line along the
// curve of the earth, origin first and each destination in turn. A stretch draws itself in when a city is added. It
// fills the question's side column from 1024px; the route itself is read out in words for assistive technology.
export default function RouteSketch({ origin, destinations, locale, label, compact = false }: RouteSketchProps) {
  const maskBase = useId();
  const [settledOrigin, setSettledOrigin] = useState(origin.trim());
  const [land, setLand] = useState<Feature<Geometry> | FeatureCollection<Geometry> | null>(null);
  // Each city found, by the name it was asked under, so removing a stop in the middle never shifts the others.
  const [found, setFound] = useState<Record<string, PlacePoint | null>>({});
  const names = [settledOrigin, ...destinations].filter((name) => name.trim() !== "");
  const namesKey = names.join("\u0000");

  useEffect(() => {
    const timer = window.setTimeout(() => setSettledOrigin(origin.trim()), TYPING_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [origin]);

  useEffect(() => {
    let cancelled = false;
    loadLand().then((shape) => {
      if (!cancelled) setLand(shape);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (namesKey === "") return;
    const controller = new AbortController();
    const asked = namesKey.split("\u0000");
    findPlacePoints(asked, locale, controller.signal)
      .then((points) => {
        if (controller.signal.aborted) return;
        setFound((current) => ({ ...current, ...Object.fromEntries(asked.map((name, index) => [name, points[index]])) }));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [namesKey, locale]);

  const placed = names.flatMap((name) => {
    const point = found[name];
    return point ? [point] : [];
  });
  if (!land || placed.length === 0) return null;

  const width = WIDTH;
  const height = compact ? 260 : HEIGHT;
  const margin = compact ? 32 : MARGIN;

  // The view is fitted to the cities, so a short hop fills the frame as well as a trip across the world.
  const lonLat = (point: PlacePoint): [number, number] => [point.longitude, point.latitude];
  const fitTo: GeoPermissibleObjects =
    placed.length === 1
      ? geoCircle().center(lonLat(placed[0])).radius(LONE_RADIUS)()
      : { type: "MultiPoint", coordinates: placed.map(lonLat) };
  const projection = geoNaturalEarth1().fitExtent(
    [
      [margin, margin],
      [width - margin, height - margin],
    ],
    fitTo,
  );
  const draw = geoPath(projection);
  const legs = placed.slice(1).map((point, index) => draw({ type: "LineString", coordinates: [lonLat(placed[index]), lonLat(point)] }) ?? "");
  const route = placed.map((point) => point.name).join(" → ");

  return (
    <figure className="overflow-clip rounded-surface border border-border bg-surface">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        className={`block h-auto w-full ${compact ? "max-h-[250px]" : "max-h-[340px]"}`}
      >
        <defs>
          {legs.map((leg, index) => (
            <mask key={`${maskBase}-${index}`} id={`${maskBase}-${index}`} maskUnits="userSpaceOnUse">
              <path
                d={leg}
                pathLength={1}
                strokeDasharray="1 1"
                fill="none"
                stroke="white"
                strokeWidth={8}
                strokeLinecap="round"
                className="motion-safe:animate-draw"
                style={{ animationDelay: `${index * SEGMENT_DELAY_MS}ms` } as CSSProperties}
              />
            </mask>
          ))}
        </defs>
        <path d={draw(land) ?? ""} className="fill-surface-muted" />
        {legs.map((leg, index) => (
          <path
            key={`${placed[index].name}-${placed[index + 1].name}`}
            d={leg}
            mask={`url(#${maskBase}-${index})`}
            fill="none"
            strokeWidth={3}
            strokeDasharray="0.5 8"
            strokeLinecap="round"
            className="stroke-primary"
          />
        ))}
        {placed.map((point, index) => {
          const [x, y] = projection(lonLat(point)) ?? [0, 0];
          const first = index === 0;
          const last = index === placed.length - 1 && !first;
          return (
            <g key={`${point.name}-${index}`} className="motion-safe:animate-pop-in" style={{ transformOrigin: `${x}px ${y}px` }}>
              <circle
                cx={x}
                cy={y}
                r={first ? 6 : 7}
                strokeWidth={first ? 3 : 2}
                className={first ? "fill-surface stroke-primary" : `${last ? "fill-accent" : "fill-primary"} stroke-surface`}
              />
              <text
                x={x > WIDTH * 0.6 ? x - 12 : x + 12}
                y={y + 4}
                textAnchor={x > WIDTH * 0.6 ? "end" : "start"}
                className="fill-text stroke-surface text-caption font-bold [paint-order:stroke] [stroke-linejoin:round] [stroke-width:4px]"
              >
                {point.name}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">{fillTemplate(label, { route })}</figcaption>
    </figure>
  );
}
