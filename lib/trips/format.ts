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

/**
 * Returns a dynamically localized trip title. If the user set a custom name,
 * that custom name is kept as-is. If the name is default ("Trip to {destination}"
 * or "Perjalanan ke {destination}"), it formats it according to current locale.
 */
export function formatTripTitle(
  name: string | null | undefined,
  destinations: string[] = [],
  locale: string = "id",
  fallbackUntitled: string = "Untitled trip",
): string {
  const destination = destinations.filter(Boolean).join(", ");
  const trimmed = (name ?? "").trim();

  // If no name is provided
  if (!trimmed) {
    if (destination) {
      return locale === "en" ? `Trip to ${destination}` : `Perjalanan ke ${destination}`;
    }
    return fallbackUntitled;
  }

  // Detect default generated titles: "Trip to <dest>" or "Perjalanan ke <dest>"
  const isDefaultEn = /^Trip to (.+)$/i.test(trimmed);
  const isDefaultId = /^Perjalanan ke (.+)$/i.test(trimmed);

  if (isDefaultEn || isDefaultId) {
    const extractedDest = trimmed.replace(/^(Trip to|Perjalanan ke)\s+/i, "").trim() || destination;
    return locale === "en" ? `Trip to ${extractedDest}` : `Perjalanan ke ${extractedDest}`;
  }

  return trimmed;
}
