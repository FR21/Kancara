// The weather a trip's dates are expected to have, as the packing list reads it.

/** Where a day's numbers come from: a forecast, or the same date a year earlier when it is too far off to forecast. */
export type WeatherSource = "forecast" | "typical";

export type WeatherDay = {
  date: string;
  /** WMO weather code. */
  code: number;
  tempMax: number;
  tempMin: number;
  /** Chance of rain in percent. Only a forecast has one. */
  rainChance: number | null;
  rainMm: number | null;
  source: WeatherSource;
};

/** One destination's weather over the trip's dates. */
export type PlaceWeather = { place: string; days: WeatherDay[] };

/** The weather of every destination of a trip, in the order the destinations were given. */
export type Weather = { places: PlaceWeather[] };

export const SKIES = ["clear", "partly", "cloudy", "fog", "drizzle", "rain", "storm", "snow"] as const;
export type Sky = (typeof SKIES)[number];

/** A trip with more destinations than this is asked for its first ones only. */
export const MAX_WEATHER_PLACES = 6;
// Past this many days a list of weather is not a trip any more.
const MAX_DAYS = 60;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The sky a WMO code stands for, in the eight kinds the app draws. */
export function skyOf(code: number): Sky {
  if (code === 0) return "clear";
  if (code <= 2) return "partly";
  if (code === 3) return "cloudy";
  if (code <= 48) return "fog";
  if (code <= 57) return "drizzle";
  if (code <= 67 || (code >= 80 && code <= 82)) return "rain";
  if (code <= 77 || code === 85 || code === 86) return "snow";
  return code >= 95 ? "storm" : "cloudy";
}

// From here a day counts as rainy. The weather shown and the packing list both read these, so a day drawn with
// a rain cloud is the same day that puts a raincoat on the list.
const RAIN_CHANCE = 50;
const RAIN_MM = 3;

export function isRainy(day: WeatherDay): boolean {
  return (day.rainChance ?? 0) >= RAIN_CHANCE || (day.rainMm ?? 0) >= RAIN_MM;
}

/**
 * The sky to draw for a day. It follows the same test as the packing list, so the picture never argues with the
 * figure beside it: rain is drawn when rain is likely, whatever the code says, and a wet code with next to no
 * chance of rain is drawn as cloud.
 */
export function shownSky(day: WeatherDay): Sky {
  const sky = skyOf(day.code);
  const dry = sky === "clear" || sky === "partly" || sky === "cloudy" || sky === "fog";
  if (dry) return isRainy(day) ? "rain" : sky;
  const wet = sky === "drizzle" || sky === "rain" || sky === "storm";
  return wet && day.rainChance !== null && !isRainy(day) ? "cloudy" : sky;
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseDay(value: unknown): WeatherDay | null {
  if (typeof value !== "object" || value === null) return null;
  const day = value as Record<string, unknown>;
  const code = asNumber(day.code);
  const tempMax = asNumber(day.tempMax);
  const tempMin = asNumber(day.tempMin);
  if (!isIsoDate(day.date) || code === null || tempMax === null || tempMin === null) return null;
  return {
    date: day.date,
    code,
    tempMax,
    tempMin,
    rainChance: asNumber(day.rainChance),
    rainMm: asNumber(day.rainMm),
    source: day.source === "typical" ? "typical" : "forecast",
  };
}

function parsePlace(value: unknown): PlaceWeather | null {
  if (typeof value !== "object" || value === null) return null;
  const { place, days } = value as { place?: unknown; days?: unknown };
  if (typeof place !== "string" || place.trim() === "" || !Array.isArray(days)) return null;
  const parsed = days.flatMap((day) => parseDay(day) ?? []).slice(0, MAX_DAYS);
  return parsed.length > 0 ? { place, days: parsed } : null;
}

export function parseWeather(value: unknown): Weather | null {
  if (typeof value !== "object" || value === null) return null;
  const { places } = value as { places?: unknown };
  if (!Array.isArray(places)) return null;
  const parsed = places.flatMap((place) => parsePlace(place) ?? []).slice(0, MAX_WEATHER_PLACES);
  return parsed.length > 0 ? { places: parsed } : null;
}
