// The Google map a day's stops are drawn on: numbered pins and the line between them. It loads through the same
// script as the meeting-point map (lib/safety/google-map.ts) and needs the same browser key. Places are found by
// their place id (the only place detail stored for good) or, for older plans, by address; the coordinates found
// stay in this tab's memory only, in line with Google Maps Platform's caching terms.
// Only the few parts of the Maps API this file touches are described here.

import { loadMaps, mapsAvailable } from "@/lib/safety/google-map";

export { mapsAvailable };

export type Point = { lat: number; lng: number };
type LatLng = { lat(): number; lng(): number };
type PinSymbol = { path: number; scale: number; fillColor: string; fillOpacity: number; strokeColor: string; strokeWeight: number };
type MarkerLabel = { text: string; color: string; fontSize: string; fontWeight: string };

export type StopMarker = {
  setIcon(icon: PinSymbol): void;
  setLabel(label: MarkerLabel): void;
  setZIndex(index: number): void;
  setMap(map: unknown): void;
  addListener(event: "click", handler: () => void): unknown;
};
export type RouteLine = { setMap(map: unknown): void };
type Bounds = { extend(point: Point): void };
export type DayMap = {
  fitBounds(bounds: Bounds, padding: number): void;
  setCenter(point: Point): void;
  setZoom(zoom: number): void;
};

type GeocodeRequest = { placeId: string } | { address: string };
type GeocodeResult = { geometry: { location: LatLng } };

type Libraries = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => DayMap;
  Marker: new (options: { position: Point; map: DayMap; icon: PinSymbol; label: MarkerLabel; zIndex: number; title: string }) => StopMarker;
  Polyline: new (options: { path: Point[]; map: DayMap; strokeColor: string; strokeOpacity: number; strokeWeight: number; geodesic: boolean }) => RouteLine;
  LatLngBounds: new () => Bounds;
  geocode: (request: GeocodeRequest) => Promise<Point | null>;
};

type MapsNamespace = {
  importLibrary(name: string): Promise<Record<string, unknown>>;
};

const found = new Map<string, Point | null>();

let loading: Promise<Libraries> | null = null;

/** The map classes and a geocoder, loaded once. Rejects when there is no key or Google refuses it. */
export function loadDayMap(): Promise<Libraries> {
  loading ??= loadMaps().then(async (maps) => {
    const google = (window as unknown as { google: { maps: MapsNamespace } }).google.maps;
    const [marker, geocoding] = await Promise.all([google.importLibrary("marker"), google.importLibrary("geocoding")]);
    const core = maps as unknown as Record<string, unknown>;
    const Geocoder = geocoding.Geocoder as new () => { geocode(request: GeocodeRequest): Promise<{ results: GeocodeResult[] }> };
    const geocoder = new Geocoder();
    return {
      Map: core.Map as Libraries["Map"],
      Polyline: core.Polyline as Libraries["Polyline"],
      LatLngBounds: (await google.importLibrary("core")).LatLngBounds as Libraries["LatLngBounds"],
      Marker: marker.Marker as Libraries["Marker"],
      geocode: async (request) => {
        const key = "placeId" in request ? `id:${request.placeId}` : `at:${request.address}`;
        if (found.has(key)) return found.get(key) ?? null;
        const point = await geocoder
          .geocode(request)
          .then(({ results }) => {
            const location = results[0]?.geometry.location;
            return location ? { lat: location.lat(), lng: location.lng() } : null;
          })
          .catch(() => null);
        found.set(key, point);
        return point;
      },
    };
  });
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

/** Google's circle symbol, for a numbered pin drawn in the app's colours instead of the red default. */
export const CIRCLE_PATH = 0;

/** A link that opens a stop in Google Maps, for the list shown when the map itself cannot load. */
export function googleMapsLink(query: string, placeId?: string): string {
  const params = new URLSearchParams({ api: "1", query });
  if (placeId) params.set("query_place_id", placeId);
  return `https://www.google.com/maps/search/?${params}`;
}
