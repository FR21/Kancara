import "server-only";
import type { PlaceWeather, WeatherDay, WeatherSource } from "@/lib/weather";

// Open-Meteo needs no key. It forecasts sixteen days ahead; for a trip further off, the same dates a year
// earlier stand in, and every day says which of the two it is.
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const FORECAST_DAYS_AHEAD = 15;
const FORECAST_DAYS_BACK = 90;
const FRESH_MS = 3 * 60 * 60 * 1000;
const TIMEOUT_MS = 6000;
const DAY_MS = 86_400_000;
const MAX_CACHED = 200;

type Place = { name: string; latitude: number; longitude: number };
type Daily = Record<string, unknown[] | undefined>;

const cache = new Map<string, { weather: PlaceWeather; fetchedAt: number }>();

async function readJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  return response.ok ? response.json() : null;
}

async function findPlace(name: string, language: string): Promise<Place | null> {
  const query = new URLSearchParams({ name, count: "1", language, format: "json" });
  const found = (await readJson(`${GEOCODE_URL}?${query}`)) as { results?: Record<string, unknown>[] } | null;
  const first = found?.results?.[0];
  if (!first || typeof first.latitude !== "number" || typeof first.longitude !== "number") return null;
  return { name: typeof first.name === "string" ? first.name : name, latitude: first.latitude, longitude: first.longitude };
}

function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function shiftYear(date: string, years: number): string {
  return `${Number(date.slice(0, 4)) + years}${date.slice(4)}`;
}

function readDays(value: unknown, source: WeatherSource, relabel: (date: string) => string): WeatherDay[] {
  const daily = (value as { daily?: Daily } | null)?.daily;
  const times = daily?.time;
  if (!daily || !Array.isArray(times)) return [];
  const at = (key: string, index: number) => {
    const entry = daily[key]?.[index];
    return typeof entry === "number" ? entry : null;
  };
  return times.flatMap((time, index): WeatherDay[] => {
    const code = at("weather_code", index);
    const tempMax = at("temperature_2m_max", index);
    const tempMin = at("temperature_2m_min", index);
    if (typeof time !== "string" || code === null || tempMax === null || tempMin === null) return [];
    return [
      {
        date: relabel(time),
        code,
        tempMax: Math.round(tempMax),
        tempMin: Math.round(tempMin),
        rainChance: at("precipitation_probability_max", index),
        rainMm: at("precipitation_sum", index),
        source,
      },
    ];
  });
}

async function fetchRange(place: Place, from: string, to: string, source: WeatherSource): Promise<WeatherDay[]> {
  const typical = source === "typical";
  // A date that falls on 29 February has no twin a year earlier; one day before is close enough for weather.
  const twin = (date: string) => (date.endsWith("-02-29") ? shiftYear(shiftDate(date, -1), -1) : shiftYear(date, -1));
  const query = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    daily: typical
      ? "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum"
      : "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum",
    timezone: "auto",
    start_date: typical ? twin(from) : from,
    end_date: typical ? twin(to) : to,
  });
  const days = readDays(await readJson(`${typical ? ARCHIVE_URL : FORECAST_URL}?${query}`), source, (date) => date);
  if (!typical) return days;
  // Last year's days are handed back under this year's dates, in order.
  return days.map((day, index) => ({ ...day, date: shiftDate(from, index) }));
}

/**
 * The weather for a place over a trip's dates, or null when the place or its weather cannot be found. Days the
 * forecast reaches come from it; later ones come from the same dates last year.
 */
export async function tripWeather(placeName: string, from: string, to: string, language: string): Promise<PlaceWeather | null> {
  const key = `${placeName.trim().toLowerCase()}|${from}|${to}|${language}`;
  const known = cache.get(key);
  if (known && Date.now() - known.fetchedAt < FRESH_MS) return known.weather;
  try {
    const place = await findPlace(placeName.trim(), language);
    if (!place) return null;
    const today = new Date().toISOString().slice(0, 10);
    const reach = shiftDate(today, FORECAST_DAYS_AHEAD);
    const earliest = shiftDate(today, -FORECAST_DAYS_BACK);
    const forecastFrom = from < earliest ? earliest : from;
    const forecastTo = to > reach ? reach : to;
    const [forecast, typical] = await Promise.all([
      forecastFrom <= forecastTo ? fetchRange(place, forecastFrom, forecastTo, "forecast") : [],
      to > reach ? fetchRange(place, from > reach ? from : shiftDate(reach, 1), to, "typical") : [],
    ]);
    const days = [...forecast, ...typical];
    if (days.length === 0) return null;
    const weather = { place: place.name, days };
    if (cache.size >= MAX_CACHED) cache.clear();
    cache.set(key, { weather, fetchedAt: Date.now() });
    return weather;
  } catch {
    return null;
  }
}
