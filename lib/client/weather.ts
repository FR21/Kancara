import { withTimeout } from "@/lib/client/abort";
import type { Locale } from "@/lib/locale";
import { type Weather, parseWeather } from "@/lib/weather";

const REQUEST_TIMEOUT_MS = 15000;
const RATE_LIMIT_WAIT_MS = 1100;

/** The weather of a trip's destinations over its dates. Throws when none of them can be had. */
export async function fetchWeather(
  places: string[],
  from: string,
  to: string,
  locale: Locale,
  signal: AbortSignal,
  retried = false,
): Promise<Weather> {
  const query = new URLSearchParams([
    ["from", from],
    ["to", to],
    ["lang", locale],
    ...places.map((place): [string, string] => ["place", place]),
  ]);
  const response = await fetch(`/api/weather?${query}`, { signal: withTimeout(signal, REQUEST_TIMEOUT_MS) });
  // Every API allows three requests a second; one busy moment is waited out, not shown as a failure.
  if (response.status === 429 && !retried) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
    return fetchWeather(places, from, to, locale, signal, true);
  }
  const weather = response.ok ? parseWeather(await response.json()) : null;
  if (!weather) throw new Error(`Weather request failed with ${response.status}`);
  return weather;
}
