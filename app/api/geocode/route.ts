import { type NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

// What stands at a point, for filling in a meeting point's name and address once its position is known. The answer
// comes from OpenStreetMap's Nominatim, which needs no key; its data may be kept, unlike a place looked up from
// Google. Nominatim asks for few requests and to be told who is asking, so answers are remembered here for a
// while and the request names the app.

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const OPEN_METEO_SEARCH_URL = "https://geocoding-api.open-meteo.com/v1/search";
const USER_AGENT = "Kancara/1.0 (group travel planner)";
const TIMEOUT_MS = 6000;
const MAX_REMEMBERED = 300;
// Four decimals is about eleven metres: close enough that two presses on the same spot share one answer.
const PRECISION = 4;

type Described = { label: string; note: string; latitude?: number; longitude?: number };
const remembered = new Map<string, Described>();

function remember(key: string, value: Described) {
  if (remembered.size >= MAX_REMEMBERED) remembered.delete(remembered.keys().next().value ?? key);
  remembered.set(key, value);
}

/**
 * `?lat=&lng=&lang=`: reverse geocode to get label & note.
 * `?q=&near=&lang=`: forward geocode to get coordinates & address for a meeting point.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "geocode");
  if (limited) return limited;

  const params = request.nextUrl.searchParams;
  const language = params.get("lang") === "en" ? "en" : "id";
  const queryText = params.get("q")?.trim();

  // Forward geocoding: resolve a place name or address into coordinates
  if (queryText) {
    const key = `search:${queryText.toLowerCase()},${language}`;
    const known = remembered.get(key);
    if (known) return NextResponse.json(known);

    // Try 1: OpenStreetMap Nominatim
    try {
      const searchUrl = `${NOMINATIM_SEARCH_URL}?format=jsonv2&q=${encodeURIComponent(queryText)}&limit=1&accept-language=${language}`;
      const reply = await fetch(searchUrl, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (reply.ok) {
        const results = (await reply.json()) as Array<{ lat?: string; lon?: string; name?: string; display_name?: string }>;
        const first = results[0];
        if (first?.lat && first?.lon) {
          const lat = parseFloat(first.lat);
          const lon = parseFloat(first.lon);
          const address = first.display_name ?? "";
          const parts = address.split(",").map((p) => p.trim());
          const label = first.name && first.name.trim() !== "" ? first.name.trim() : parts[0] || queryText;
          const note = (parts[0] === label ? parts.slice(1) : parts).join(", ");
          const described: Described = { label, note, latitude: lat, longitude: lon };
          remember(key, described);
          return NextResponse.json(described);
        }
      }
    } catch {
      // Fallback to Open-Meteo
    }

    // Try 2: Open-Meteo Geocoding
    try {
      const cleanName = queryText.split(",")[0].trim();
      const meteoUrl = `${OPEN_METEO_SEARCH_URL}?name=${encodeURIComponent(cleanName)}&count=1&format=json`;
      const reply = await fetch(meteoUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (reply.ok) {
        const data = (await reply.json()) as { results?: Array<{ latitude: number; longitude: number; name: string; country?: string; admin1?: string }> };
        const found = data.results?.[0];
        if (found && typeof found.latitude === "number" && typeof found.longitude === "number") {
          const note = [found.admin1, found.country].filter(Boolean).join(", ");
          const described: Described = { label: found.name, note, latitude: found.latitude, longitude: found.longitude };
          remember(key, described);
          return NextResponse.json(described);
        }
      }
    } catch {
      // Return 404 if both fail
    }

    return NextResponse.json({ error: "Could not find coordinates for this place" }, { status: 404 });
  }

  // Reverse geocoding: resolve coordinates into label & note
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lng"));
  if (!params.get("lat") || !params.get("lng") || !(Math.abs(latitude) <= 90) || !(Math.abs(longitude) <= 180)) {
    return NextResponse.json({ error: "Invalid point" }, { status: 400 });
  }
  const key = `${latitude.toFixed(PRECISION)},${longitude.toFixed(PRECISION)},${language}`;
  const known = remembered.get(key);
  if (known) return NextResponse.json(known);

  try {
    const query = new URLSearchParams({
      format: "jsonv2",
      lat: String(latitude),
      lon: String(longitude),
      zoom: "18",
      "accept-language": language,
    });
    const reply = await fetch(`${NOMINATIM_REVERSE_URL}?${query}`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const data = (await reply.json()) as { name?: unknown; display_name?: unknown };
    const address = typeof data.display_name === "string" ? data.display_name : "";
    if (!reply.ok || address === "") return NextResponse.json({ error: "Nothing is known at this point" }, { status: 404 });

    // The place's own name leads when it has one; otherwise the first part of the address does.
    const parts = address.split(",").map((part) => part.trim());
    const label = typeof data.name === "string" && data.name.trim() !== "" ? data.name.trim() : parts[0];
    const described: Described = { label, note: (parts[0] === label ? parts.slice(1) : parts).join(", ") };
    remember(key, described);
    return NextResponse.json(described);
  } catch {
    return NextResponse.json({ error: "The address could not be looked up" }, { status: 502 });
  }
}
