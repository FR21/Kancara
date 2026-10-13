import { COUNTRIES, countryNames } from "./countries";

// Finding a country by a name someone types: in their language or in English, with accents and case ignored and a
// slip or two forgiven.

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** How many single-letter slips (a letter missing, extra, wrong, or two swapped) turn one word into the other. */
function slips(first: string, second: string): number {
  const rows = Array.from({ length: first.length + 1 }, (_, row) => [row, ...Array<number>(second.length).fill(0)]);
  for (let column = 1; column <= second.length; column += 1) rows[0][column] = column;
  for (let row = 1; row <= first.length; row += 1) {
    for (let column = 1; column <= second.length; column += 1) {
      const same = first[row - 1] === second[column - 1] ? 0 : 1;
      rows[row][column] = Math.min(rows[row - 1][column] + 1, rows[row][column - 1] + 1, rows[row - 1][column - 1] + same);
      const swapped = row > 1 && column > 1 && first[row - 1] === second[column - 2] && first[row - 2] === second[column - 1];
      if (swapped) rows[row][column] = Math.min(rows[row][column], rows[row - 2][column - 2] + 1);
    }
  }
  return rows[first.length][second.length];
}

/**
 * How well a name answers what was typed: lower is better, null is no match. A name that starts with it comes
 * first, then one with a word that starts with it, then one that holds it anywhere, then one that is only a
 * slip or two away ("indonsia", "jeapng").
 */
function closeness(typed: string, name: string): number | null {
  if (name.startsWith(typed)) return 0;
  if (name.split(" ").some((word) => word.startsWith(typed))) return 1;
  if (name.includes(typed)) return 2;
  if (typed.length < 3) return null;
  const allowed = typed.length < 6 ? 1 : 2;
  // The typed text is held against the start of each word, since someone is usually still typing it.
  const nearest = Math.min(...name.split(" ").map((word) => slips(typed, word.slice(0, Math.max(typed.length, 1)))), slips(typed, name.slice(0, typed.length)));
  return nearest <= allowed ? 2 + nearest : null;
}

export type CountryChoice = { code: string; name: string };

/**
 * The countries that answer what was typed, best first, each under its name in the given language. Names are
 * matched in that language and in English, with accents and case ignored, and a slip or two forgiven.
 */
export function searchCountries(typed: string, locale: string, exclude: string[] = []): CountryChoice[] {
  const names = countryNames(locale);
  const query = fold(typed);
  const choices = COUNTRIES.filter((country) => !exclude.includes(country.code)).map((country) => ({
    code: country.code,
    name: names.get(country.code) ?? country.name,
    english: country.name,
  }));
  const ordered = (list: (CountryChoice & { rank: number })[]) =>
    list.sort((first, second) => first.rank - second.rank || first.name.localeCompare(second.name, locale)).map(({ code, name }) => ({ code, name }));
  if (query === "") return ordered(choices.map((choice) => ({ ...choice, rank: 0 })));
  return ordered(
    choices.flatMap((choice) => {
      const ranks = [closeness(query, fold(choice.name)), closeness(query, fold(choice.english)), choice.code.toLowerCase() === query ? 0 : null].filter(
        (rank): rank is number => rank !== null,
      );
      return ranks.length > 0 ? [{ ...choice, rank: Math.min(...ranks) }] : [];
    }),
  );
}

/**
 * The country a stored "where from" stands for. It is a country code now; rows from before the country picker
 * hold free text ("Indonesia", "Indonesian"), which is read as the country whose name it starts with or begins.
 * Empty when it names no country here.
 */
export function countryOf(stored: string): string {
  const value = stored.trim();
  if (value === "") return "";
  const code = value.toUpperCase();
  if (COUNTRIES.some((country) => country.code === code)) return code;
  const typed = fold(value);
  if (typed.length < 4) return "";
  const indonesian = countryNames("id");
  const found = COUNTRIES.find((country) =>
    [country.name, indonesian.get(country.code) ?? ""].map(fold).some((name) => name !== "" && (typed.startsWith(name) || name.startsWith(typed))),
  );
  return found?.code ?? "";
}
