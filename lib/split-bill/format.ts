/** Whole Rupiah written out in full, "Rp 150.000" in Indonesian and "Rp 150,000" in English. */
export function formatRupiah(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "IDR",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

/** Today's date as a bill shows it, in WIB. */
export function formatBillDate(locale: string, now = new Date()): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(now);
}
