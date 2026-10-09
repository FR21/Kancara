import "server-only";
import { type ExchangeRate, ESTIMATED_RATE, parseExchangeRate } from "@/lib/currency";

// Frankfurter publishes the European Central Bank's daily reference rates and needs no key.
const SOURCE_URL = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=IDR";
const FRESH_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 5000;

let last: { rate: ExchangeRate; fetchedAt: number } | null = null;

function readSource(value: unknown): ExchangeRate | null {
  if (typeof value !== "object" || value === null) return null;
  const { date, rates } = value as { date?: unknown; rates?: { IDR?: unknown } };
  const rate = parseExchangeRate({ idrPerUsd: rates?.IDR, date });
  return rate?.date ? rate : null;
}

/**
 * Today's dollar rate, asked for at most once every six hours. When the source
 * cannot be reached the last rate it gave is used, and failing that the estimate.
 */
export async function currentRate(): Promise<ExchangeRate> {
  if (last && Date.now() - last.fetchedAt < FRESH_MS) return last.rate;
  try {
    const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const rate = response.ok ? readSource(await response.json()) : null;
    if (!rate) return last?.rate ?? ESTIMATED_RATE;
    last = { rate, fetchedAt: Date.now() };
    return rate;
  } catch {
    return last?.rate ?? ESTIMATED_RATE;
  }
}
