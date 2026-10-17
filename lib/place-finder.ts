import "server-only";

// Finds a town or city by name with Open-Meteo's geocoder (GeoNames data: no key, and the answer may be kept),
// for the weather of a trip and the sketch of its route.

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const TIMEOUT_MS = 6000;

export type FoundPlace = { name: string; country: string; latitude: number; longitude: number };

type GeocodeResult = Record<string, unknown>;

const AREA_FIELDS = ["admin1", "admin2", "admin3", "admin4", "country"];

/** Instant & accurate presets for common Indonesian tourist regions and provinces. */
const KNOWN_DESTINATIONS: Record<string, FoundPlace> = {
  aceh: { name: "Aceh", country: "Indonesia", latitude: 5.54167, longitude: 95.33333 },
  "banda aceh": { name: "Banda Aceh", country: "Indonesia", latitude: 5.54167, longitude: 95.33333 },
  bali: { name: "Bali", country: "Indonesia", latitude: -8.65, longitude: 115.21667 },
  denpasar: { name: "Denpasar", country: "Indonesia", latitude: -8.65, longitude: 115.21667 },
  lombok: { name: "Lombok", country: "Indonesia", latitude: -8.58333, longitude: 116.11667 },
  mataram: { name: "Mataram", country: "Indonesia", latitude: -8.58333, longitude: 116.11667 },
  jogja: { name: "Yogyakarta", country: "Indonesia", latitude: -7.80139, longitude: 110.36472 },
  yogyakarta: { name: "Yogyakarta", country: "Indonesia", latitude: -7.80139, longitude: 110.36472 },
  jakarta: { name: "Jakarta", country: "Indonesia", latitude: -6.21462, longitude: 106.84513 },
  bandung: { name: "Bandung", country: "Indonesia", latitude: -6.92147, longitude: 107.60742 },
  surabaya: { name: "Surabaya", country: "Indonesia", latitude: -7.24917, longitude: 112.75083 },
  semarang: { name: "Semarang", country: "Indonesia", latitude: -6.9932, longitude: 110.4203 },
  malang: { name: "Malang", country: "Indonesia", latitude: -7.9797, longitude: 112.6304 },
  medan: { name: "Medan", country: "Indonesia", latitude: 3.58333, longitude: 98.66667 },
  padang: { name: "Padang", country: "Indonesia", latitude: -0.94924, longitude: 100.35427 },
  palembang: { name: "Palembang", country: "Indonesia", latitude: -2.91673, longitude: 104.7458 },
  makassar: { name: "Makassar", country: "Indonesia", latitude: -5.14861, longitude: 119.43194 },
  manado: { name: "Manado", country: "Indonesia", latitude: 1.487, longitude: 124.8455 },
  "labuan bajo": { name: "Labuan Bajo", country: "Indonesia", latitude: -8.4964, longitude: 119.8877 },
  "raja ampat": { name: "Raja Ampat", country: "Indonesia", latitude: -0.2333, longitude: 130.5167 },
  belitung: { name: "Belitung", country: "Indonesia", latitude: -2.7411, longitude: 107.6581 },
  bangka: { name: "Bangka", country: "Indonesia", latitude: -2.1333, longitude: 106.1167 },
  bromo: { name: "Bromo", country: "Indonesia", latitude: -7.9425, longitude: 112.953 },
  toba: { name: "Danau Toba", country: "Indonesia", latitude: 2.6845, longitude: 98.8756 },
  "danau toba": { name: "Danau Toba", country: "Indonesia", latitude: 2.6845, longitude: 98.8756 },
  toraja: { name: "Toraja", country: "Indonesia", latitude: -2.9761, longitude: 119.8972 },
  wakatobi: { name: "Wakatobi", country: "Indonesia", latitude: -5.3256, longitude: 123.5936 },
  karimunjawa: { name: "Karimunjawa", country: "Indonesia", latitude: -5.8458, longitude: 110.4358 },
  derawan: { name: "Derawan", country: "Indonesia", latitude: 2.2858, longitude: 118.2439 },
  sabang: { name: "Sabang", country: "Indonesia", latitude: 5.8933, longitude: 95.3164 },
  banyuwangi: { name: "Banyuwangi", country: "Indonesia", latitude: -8.2192, longitude: 114.3692 },
  solo: { name: "Surakarta", country: "Indonesia", latitude: -7.5561, longitude: 110.8317 },
  surakarta: { name: "Surakarta", country: "Indonesia", latitude: -7.5561, longitude: 110.8317 },
  batam: { name: "Batam", country: "Indonesia", latitude: 1.1301, longitude: 104.0529 },
  bintan: { name: "Bintan", country: "Indonesia", latitude: 1.1378, longitude: 104.5388 },
  dieng: { name: "Dieng", country: "Indonesia", latitude: -7.2062, longitude: 109.9079 },
  samosir: { name: "Samosir", country: "Indonesia", latitude: 2.6074, longitude: 98.7153 },
};

/** Common search term aliases to ensure accurate geocoder queries. */
const PLACE_ALIASES: Record<string, string> = {
  aceh: "Banda Aceh",
  "nanggroe aceh darussalam": "Banda Aceh",
  bali: "Denpasar",
  "pulau bali": "Denpasar",
  lombok: "Mataram",
  "pulau lombok": "Mataram",
  jogja: "Yogyakarta",
  jogjakarta: "Yogyakarta",
  "di yogyakarta": "Yogyakarta",
  papua: "Jayapura",
  flores: "Labuan Bajo",
  sumba: "Waingapu",
  "raja ampat": "Waisai",
  "labuan bajo": "Labuan Bajo",
  belitung: "Tanjung Pandan",
  bangka: "Pangkal Pinang",
  bromo: "Probolinggo",
  toba: "Parapat",
  "danau toba": "Parapat",
  toraja: "Rantepao",
  wakatobi: "Wangi-Wangi",
  karimunjawa: "Karimunjawa",
  derawan: "Kepulauan Derawan",
  dieng: "Wonosobo",
  bunaken: "Manado",
  sabang: "Kota Sabang",
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Kancara/1.0 (group travel planner)";

async function readJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  return response.ok ? response.json() : null;
}

const INVALID_CATEGORIES = new Set([
  "amenity",
  "shop",
  "building",
  "highway",
  "office",
  "craft",
  "commercial",
  "leisure",
  "railway",
  "aeroway",
  "emergency",
  "historic",
  "man_made",
  "landuse",
  "club",
]);

const INVALID_TYPES = new Set([
  "restaurant",
  "cafe",
  "bar",
  "fast_food",
  "pub",
  "yes",
  "house",
  "residential",
  "apartments",
  "beauty",
  "supermarket",
  "convenience",
  "clothes",
  "hairdresser",
  "station",
  "stop",
  "platform",
  "fuel",
]);

async function searchNominatim(query: string, language: string): Promise<FoundPlace | null> {
  try {
    const url = `${NOMINATIM_URL}?format=jsonv2&q=${encodeURIComponent(query)}&limit=5&accept-language=${language}`;
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const results = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
      name?: string;
      display_name?: string;
      category?: string;
      type?: string;
      addresstype?: string;
      place_rank?: number;
    }>;

    const q = query.trim().toLowerCase();

    // Pick the first result that is genuinely a city, town, administrative region, island, or geographic territory
    const first = results?.find((item) => {
      if (!item.lat || !item.lon) return false;
      const cat = (item.category || "").toLowerCase();
      const type = (item.type || "").toLowerCase();
      const addrType = (item.addresstype || "").toLowerCase();
      const rank = typeof item.place_rank === "number" ? item.place_rank : 30;

      if (INVALID_CATEGORIES.has(cat)) return false;
      if (INVALID_TYPES.has(type) || INVALID_TYPES.has(addrType)) return false;
      if (rank > 22) return false;

      // Must be a recognized geographic place, administrative boundary, or natural feature
      const isGeographic = cat === "boundary" || cat === "place" || cat === "natural";
      if (!isGeographic) return false;

      // Ensure the name or display name has actual lexical relation to the query
      const itemName = (item.name || "").toLowerCase();
      const dispName = (item.display_name || "").toLowerCase();
      return itemName.includes(q) || q.includes(itemName) || dispName.includes(q);
    });

    if (first?.lat && first?.lon) {
      const parts = (first.display_name ?? "").split(",").map((p) => p.trim());
      const rawName = first.name && first.name.trim() !== "" ? first.name.trim() : parts[0] || query;
      const country = parts[parts.length - 1] || "";
      return {
        name: cleanPlaceName(rawName),
        country,
        latitude: parseFloat(first.lat),
        longitude: parseFloat(first.lon),
      };
    }
  } catch {
    // Network or timeout, fallback to Open-Meteo
  }
  return null;
}

async function searchPlaces(name: string, language: string): Promise<GeocodeResult[]> {
  const query = new URLSearchParams({ name, count: "10", language, format: "json" });
  const found = (await readJson(`${GEOCODE_URL}?${query}`).catch(() => null)) as { results?: GeocodeResult[] } | null;
  return (found?.results ?? []).filter((result) => typeof result.latitude === "number" && typeof result.longitude === "number");
}

/** Scores a geocoding result to prefer exact name matches, population, and Indonesian destinations when appropriate. */
function scoreResult(result: GeocodeResult, query: string, preferIndonesia: boolean): number {
  const name = typeof result.name === "string" ? result.name.toLowerCase() : "";
  const q = query.toLowerCase().trim();
  const countryCode = typeof result.country_code === "string" ? result.country_code.toUpperCase() : "";
  const admin1 = typeof result.admin1 === "string" ? result.admin1.toLowerCase() : "";
  const admin2 = typeof result.admin2 === "string" ? result.admin2.toLowerCase() : "";
  const population = typeof result.population === "number" ? result.population : 0;
  const featureCode = typeof result.feature_code === "string" ? result.feature_code.toUpperCase() : "";

  let score = 0;

  // Must have some match with query
  const hasNameMatch = name === q || name.startsWith(q) || q.startsWith(name) || name.includes(q) || q.includes(name);
  const hasAdminMatch = admin1.includes(q) || admin2.includes(q);
  if (!hasNameMatch && !hasAdminMatch) {
    return -100; // Reject completely unrelated matches
  }

  // Exact name match
  if (name === q) {
    score += 100;
  } else if (name.startsWith(q) || q.startsWith(name)) {
    score += 50;
  } else if (name.includes(q)) {
    score += 25;
  }

  // Admin / province match (e.g. searching "Aceh" matching admin1: "Aceh")
  if (admin1 === q || admin1.includes(q)) {
    score += 40;
  }
  if (admin2 === q || admin2.includes(q)) {
    score += 20;
  }

  // Country bias for Indonesian app users
  if (preferIndonesia && countryCode === "ID") {
    score += 60;
  }

  // Feature type bias (cities, administrative capitals, islands > small villages)
  if (featureCode.startsWith("PPLC") || featureCode.startsWith("PPLA")) {
    score += 30;
  } else if (featureCode.startsWith("PPL")) {
    score += 10;
  } else if (featureCode === "ISL") {
    score += 25;
  }

  // Population scale
  if (population > 1_000_000) {
    score += 40;
  } else if (population > 100_000) {
    score += 25;
  } else if (population > 10_000) {
    score += 10;
  }

  // Penalize tiny places with low population that only match as a prefix (like Acehuche for Aceh)
  if (countryCode !== "ID" && population < 5000 && !name.includes(q) && name !== q) {
    score -= 60;
  }

  return score;
}

/** True when the result lies in the area the rest of the name points at ("Jakarta" for "Glodok, Jakarta"). */
function liesIn(result: GeocodeResult, area: string): boolean {
  const wanted = area.toLowerCase();
  return AREA_FIELDS.some((field) => {
    const value = result[field];
    return typeof value === "string" && (value.toLowerCase().includes(wanted) || wanted.includes(value.toLowerCase()));
  });
}

function cleanPlaceName(rawName: string): string {
  // Strip administrative prefix for cleaner map labels (e.g. "Kota Banda Aceh" -> "Banda Aceh")
  return rawName.replace(/^(Kota|Kabupaten)\s+/i, "").trim();
}

export async function findPlace(name: string, language: string): Promise<FoundPlace | null> {
  const trimmed = name.trim();
  const normalized = trimmed.toLowerCase();

  // 1. Instant preset lookup for popular Indonesian destinations
  if (KNOWN_DESTINATIONS[normalized]) {
    const preset = KNOWN_DESTINATIONS[normalized];
    return {
      ...preset,
      name: preset.name,
    };
  }

  const parts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  const [specific] = parts;
  const area = parts.slice(1).join(", ");
  const alias = PLACE_ALIASES[normalized] || PLACE_ALIASES[specific.toLowerCase()];

  const attempts = [
    ...(alias ? [alias] : []),
    ...(parts.length > 1 ? [trimmed, specific, parts[parts.length - 1]] : [trimmed]),
  ];

  // 2. Try Nominatim first (high accuracy worldwide, no IPv6 timeout issues)
  for (const attempt of attempts) {
    const nominatimPlace = await searchNominatim(attempt, language);
    if (nominatimPlace) return nominatimPlace;
  }

  // 3. Fallback to Open-Meteo with scoring
  const languages = [...new Set([language, "en"])];
  const preferIndonesia = language === "id" || !!alias;

  for (const attempt of attempts) {
    for (const tongue of languages) {
      const results = await searchPlaces(attempt, tongue);
      if (results.length === 0) continue;

      // Sort results by relevance score
      results.sort((a, b) => scoreResult(b, attempt, preferIndonesia) - scoreResult(a, attempt, preferIndonesia));

      const inArea = attempt === specific && area ? results.find((result) => liesIn(result, area)) : undefined;
      const best = inArea ?? results[0];
      const bestScore = scoreResult(best, attempt, preferIndonesia);
      if (bestScore < 20) continue;

      const rawName = typeof best.name === "string" ? best.name : attempt;
      return {
        name: cleanPlaceName(rawName),
        country: typeof best.country === "string" ? best.country : "",
        latitude: best.latitude as number,
        longitude: best.longitude as number,
      };
    }
  }
  return null;
}

