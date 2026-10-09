import { type ExchangeRate, parseExchangeRate } from "@/lib/currency";

const REQUEST_TIMEOUT_MS = 8000;
const RATE_LIMIT_WAIT_MS = 1100;

export async function fetchExchangeRate(signal: AbortSignal, retried = false): Promise<ExchangeRate> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const response = await fetch("/api/exchange-rate", { signal: AbortSignal.any([signal, timeout]) });
  // Every API allows three requests a second; one busy moment is waited out, not shown as a failure.
  if (response.status === 429 && !retried) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
    return fetchExchangeRate(signal, true);
  }
  const rate = response.ok ? parseExchangeRate(await response.json()) : null;
  if (!rate) throw new Error(`Exchange rate request failed with ${response.status}`);
  return rate;
}
