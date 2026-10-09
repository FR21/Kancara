export const CURRENCIES = ["IDR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** How many Rupiah one US dollar buys, and the day that rate is from. The built-in estimate has no day. */
export type ExchangeRate = { idrPerUsd: number; date: string | null };

// In use until the live rate has loaded, and whenever it cannot be loaded. Set from the rate on 9 October 2026.
export const ESTIMATED_RATE: ExchangeRate = { idrPerUsd: 17_900, date: null };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function usdToIdr(usd: number, rate: ExchangeRate): number {
  return Math.round(usd * rate.idrPerUsd);
}

export function idrToUsd(idr: number, rate: ExchangeRate): number {
  return Math.round(idr / rate.idrPerUsd);
}

export function parseExchangeRate(value: unknown): ExchangeRate | null {
  if (typeof value !== "object" || value === null) return null;
  const { idrPerUsd, date } = value as { idrPerUsd?: unknown; date?: unknown };
  if (typeof idrPerUsd !== "number" || !Number.isFinite(idrPerUsd) || idrPerUsd <= 0) return null;
  return { idrPerUsd, date: typeof date === "string" && ISO_DATE.test(date) ? date : null };
}
