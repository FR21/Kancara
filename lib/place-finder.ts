import "server-only";

// Finds a town or city by name with Open-Meteo's geocoder (GeoNames data: no key, and the answer may be kept),
// for the weather of a trip and the sketch of its route.

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const TIMEOUT_MS = 6000;

export type FoundPlace = { name: string; country: string; latitude: number; longitude: number };

async function readJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  return response.ok ? response.json() : null;
}

type GeocodeResult = Record<string, unknown>;

const AREA_FIELDS = ["admin1", "admin2", "admin3", "admin4", "country"];

async function searchPlaces(name: string, language: string): Promise<GeocodeResult[]> {
  const query = new URLSearchParams({ name, count: "10", language, format: "json" });
  const found = (await readJson(`${GEOCODE_URL}?${query}`)) as { results?: GeocodeResult[] } | null;
  return (found?.results ?? []).filter((result) => typeof result.latitude === "number" && typeof result.longitude === "number");
}

/** True when the result lies in the area the rest of the name points at ("Jakarta" for "Glodok, Jakarta"). */
function liesIn(result: GeocodeResult, area: string): boolean {
  const wanted = area.toLowerCase();
  return AREA_FIELDS.some((field) => {
    const value = result[field];
    return typeof value === "string" && (value.toLowerCase().includes(wanted) || wanted.includes(value.toLowerCase()));
  });
}

// Open-Meteo matches one place name, and a name with a comma ("Glodok, Jakarta") is found in some languages and
// not in others. So the whole name is tried first, then its most specific part (preferring a match inside the
// area the rest names), then the broadest part, each in the page's language and then in English.
export async function findPlace(name: string, language: string): Promise<FoundPlace | null> {
  const parts = name.split(",").map((part) => part.trim()).filter(Boolean);
  const [specific] = parts;
  const area = parts.slice(1).join(", ");
  const attempts = parts.length > 1 ? [name, specific, parts[parts.length - 1]] : [name];
  const languages = [...new Set([language, "en"])];
  for (const attempt of attempts) {
    for (const tongue of languages) {
      const results = await searchPlaces(attempt, tongue);
      if (results.length === 0) continue;
      const inArea = attempt === specific && area ? results.find((result) => liesIn(result, area)) : undefined;
      const best = inArea ?? results[0];
      return {
        name: typeof best.name === "string" ? best.name : attempt,
        country: typeof best.country === "string" ? best.country : "",
        latitude: best.latitude as number,
        longitude: best.longitude as number,
      };
    }
  }
  return null;
}
