import { fillTemplate, parseLocalDate } from "@/lib/plan-draft";

export type PluralForms = { one: string; other: string };

/** Picks the singular or plural template for a count, e.g. "1 trip" and "3 trips". */
export function plural(forms: PluralForms, count: number, locale: string): string {
  const form = new Intl.PluralRules(locale).select(count) === "one" ? forms.one : forms.other;
  return fillTemplate(form, { count });
}

export function formatTripDates(startDate: string, endDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).formatRange(
    parseLocalDate(startDate),
    parseLocalDate(endDate),
  );
}

export function formatDays(days: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "unit", unit: "day", unitDisplay: "long" }).format(days);
}

export function formatMoney(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

/** "tomorrow" or "in 5 days", in the reader's language. */
export function formatDaysAhead(days: number, locale: string): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(days, "day");
}
