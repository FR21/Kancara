import { withTimeout } from "@/lib/client/abort";
import { keepTripOffline, keepUrls } from "@/lib/client/keep-trip-offline";
import { type SharedFieldPass, parseSharedFieldPass } from "@/lib/field-pass/pass";
import type { Locale } from "@/lib/locale";
import { DATA_CACHE } from "@/lib/offline-caches";

/** Why a pass could not be had: no connection and no kept copy, no destination to write it for, written moments ago, or anything else. */
export type FieldPassFailure = "offline" | "noDestination" | "tooSoon" | "failed";

export class FieldPassError extends Error {
  constructor(readonly reason: FieldPassFailure) {
    super(`Field pass request failed: ${reason}`);
  }
}

const READ_TIMEOUT_MS = 15_000;
// Writing a pass is a model call on the server, which is allowed up to 30 seconds.
const WRITE_TIMEOUT_MS = 35_000;
const RATE_LIMIT_WAIT_MS = 1100;

const passUrl = (tripId: string, locale: Locale) => `/api/field-pass/${encodeURIComponent(tripId)}?locale=${locale}`;

function failureOf(status: number): FieldPassFailure {
  if (status === 422) return "noDestination";
  if (status === 409) return "tooSoon";
  return "failed";
}

async function request(url: string, init: RequestInit, retried = false): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === "AbortError" && init.signal?.aborted) throw caught;
    throw new FieldPassError(navigator.onLine ? "failed" : "offline");
  }
  // Every API allows three requests a second; one busy moment is waited out, not shown as a failure.
  if (response.status === 429 && !retried) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
    return request(url, init, true);
  }
  if (!response.ok) throw new FieldPassError(failureOf(response.status));
  return response;
}

function readAnswer(value: unknown): SharedFieldPass | null {
  if (typeof value === "object" && value !== null && "pass" in value && value.pass === null) return null;
  const shared = parseSharedFieldPass(value);
  if (!shared) throw new FieldPassError("failed");
  return shared;
}

export const fieldPasses = {
  /** The pass the group shares, or null when nobody has had it written yet. Answered from the kept copy offline. */
  async read(tripId: string, locale: Locale, signal: AbortSignal): Promise<SharedFieldPass | null> {
    const response = await request(passUrl(tripId, locale), { signal: withTimeout(signal, READ_TIMEOUT_MS) });
    return readAnswer(await response.json());
  },

  /** Has the pass written: the first time, or again when `rewrite` is set. */
  async write(tripId: string, locale: Locale, rewrite: boolean, signal: AbortSignal): Promise<SharedFieldPass> {
    const response = await request(`/api/field-pass/${encodeURIComponent(tripId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, rewrite }),
      signal: withTimeout(signal, WRITE_TIMEOUT_MS),
    });
    const shared = readAnswer(await response.json());
    if (!shared) throw new FieldPassError("failed");
    return shared;
  },
};

/**
 * Puts the pass and the whole trip where the service worker finds them without a connection (see
 * keepTripOffline). False when the browser keeps nothing or a part could not be fetched.
 */
export async function keepFieldPassOffline(tripId: string, locale: Locale): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  try {
    const [pass, trip] = await Promise.all([keepUrls(DATA_CACHE, [passUrl(tripId, locale)]), keepTripOffline(tripId)]);
    return pass && trip;
  } catch {
    return false;
  }
}

/** Whether this phone already keeps the pass for reading without a connection. */
export async function isFieldPassKept(tripId: string, locale: Locale): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  try {
    const cache = await caches.open(DATA_CACHE);
    return (await cache.match(passUrl(tripId, locale))) !== undefined;
  } catch {
    return false;
  }
}
