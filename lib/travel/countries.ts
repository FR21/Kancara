import data from "./countries.json";

export type Country = {
  code: string;
  id: string;
  name: string;
  point: number[];
  dot?: boolean;
};

export const COUNTRIES: Country[] = data;

const COUNTRY_BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));

export function isCountryCode(value: unknown): value is string {
  return typeof value === "string" && COUNTRY_BY_CODE.has(value);
}

export function countryNames(locale: string): Map<string, string> {
  const display = new Intl.DisplayNames([locale], { type: "region", fallback: "none" });
  return new Map(COUNTRIES.map((country) => [country.code, display.of(country.code) ?? country.name]));
}
