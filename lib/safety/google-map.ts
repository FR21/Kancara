// The Google map a meeting point is picked on. The script is loaded once, and only when a map is first opened;
// nothing of it is kept on the phone (the service worker leaves other origins alone), so the map needs a connection.
// Only the few parts of the Maps API this app touches are described here.

type LatLng = { lat(): number; lng(): number };
type Point = { lat: number; lng: number };
type MapOptions = {
  center: Point;
  zoom: number;
  disableDefaultUI: boolean;
  zoomControl: boolean;
  clickableIcons: boolean;
  gestureHandling: "greedy";
  colorScheme: "LIGHT" | "DARK";
};
export type GoogleMap = {
  getCenter(): LatLng | undefined;
  setCenter(point: Point): void;
  setZoom(zoom: number): void;
  addListener(event: "dragend" | "zoom_changed", handler: () => void): unknown;
};
type MapsLibrary = { Map: new (element: HTMLElement, options: MapOptions) => GoogleMap };

declare global {
  interface Window {
    google?: { maps: { importLibrary(name: "maps"): Promise<MapsLibrary> } };
    /** Google calls this when the key is refused. */
    gm_authFailure?: () => void;
  }
}

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const SCRIPT_URL = "https://maps.googleapis.com/maps/api/js";

/** False where no browser key is set, so the page offers the phone's own position alone. */
export const mapsAvailable = KEY !== "";

let loading: Promise<MapsLibrary> | null = null;

export function loadMaps(): Promise<MapsLibrary> {
  loading ??= new Promise<MapsLibrary>((resolve, reject) => {
    const fail = () => {
      // A later try starts over instead of handing back this failure.
      loading = null;
      reject(new Error("The map could not be loaded"));
    };
    const script = document.createElement("script");
    script.src = `${SCRIPT_URL}?key=${encodeURIComponent(KEY)}&v=weekly&loading=async`;
    script.async = true;
    script.onerror = fail;
    script.onload = () => {
      if (window.google) window.google.maps.importLibrary("maps").then(resolve, fail);
      else fail();
    };
    window.gm_authFailure = fail;
    document.head.append(script);
  });
  return loading;
}
