import { type NextRequest, NextResponse } from "next/server";
import { isLocale } from "@/lib/locale";
import { rateLimit } from "@/lib/rate-limit";
import { isIsoDate, MAX_WEATHER_PLACES } from "@/lib/weather";
import { tripWeather } from "@/lib/weather-source";

const MAX_PLACE_CHARS = 80;
const MAX_TRIP_DAYS = 60;
const DAY_MS = 86_400_000;

/**
 * The weather of a trip's destinations over its dates, one `place` per destination:
 * `?place=Bandung&place=Yogyakarta&from=2026-11-07&to=2026-11-08`. A destination that cannot be found is left out.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "weather");
  if (limited) return limited;

  const params = request.nextUrl.searchParams;
  const places = [...new Set(params.getAll("place").map((place) => place.trim()))]
    .filter((place) => place !== "")
    .slice(0, MAX_WEATHER_PLACES);
  const from = params.get("from");
  const to = params.get("to");
  const language = params.get("lang");
  const placesValid = places.length > 0 && places.every((place) => place.length <= MAX_PLACE_CHARS);
  if (!placesValid || !isIsoDate(from) || !isIsoDate(to) || to < from) {
    return NextResponse.json({ error: "Invalid place or dates" }, { status: 400 });
  }
  if ((Date.parse(to) - Date.parse(from)) / DAY_MS >= MAX_TRIP_DAYS) {
    return NextResponse.json({ error: "Trip too long" }, { status: 400 });
  }

  const locale = isLocale(language) ? language : "id";
  const found = await Promise.all(places.map((place) => tripWeather(place, from, to, locale)));
  const weather = { places: found.flatMap((entry) => entry ?? []) };
  if (weather.places.length === 0) return NextResponse.json({ error: "Weather unavailable" }, { status: 404 });
  return NextResponse.json(weather);
}
