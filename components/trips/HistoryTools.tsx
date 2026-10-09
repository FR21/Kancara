"use client";

import { ArrowRight, Check, Globe, Search } from "lucide-react";
import Link from "next/link";
import { choiceClass, INPUT } from "@/components/plan/styles";
import type { Messages } from "@/lib/messages";
import { plural } from "@/lib/trips/format";
import { useLocale } from "@/lib/use-locale";

type HistoryToolsProps = {
  text: Messages["trips"]["history"];
  mapLabel: string;
  total: number;
  countries: number;
  years: number[];
  query: string;
  year: number | null;
  onQueryChange: (query: string) => void;
  onYearChange: (year: number | null) => void;
};

export default function HistoryTools({
  text,
  mapLabel,
  total,
  countries,
  years,
  query,
  year,
  onQueryChange,
  onYearChange,
}: HistoryToolsProps) {
  const locale = useLocale();
  const summary = [plural(text.trips, total, locale)];
  // Countries are only known for trips that recorded them, so the count is left out at zero.
  if (countries > 0) summary.push(plural(text.countries, countries, locale));
  const yearOptions: (number | null)[] = [null, ...years];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-label-lg text-text tabular-nums">{summary.join(" · ")}</p>
        <Link
          href="/profile/map"
          className="group inline-flex min-h-11 items-center gap-2 rounded-sm text-label text-primary underline-offset-4 hover:underline"
        >
          <Globe className="size-4" aria-hidden="true" />
          {mapLabel}
          <ArrowRight
            className="size-4 transition-[translate] duration-200 ease-out group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <div className="group relative">
          <label htmlFor="trips-search" className="sr-only">
            {text.searchLabel}
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-text-muted transition-colors duration-150 ease-out group-focus-within:text-primary"
          />
          <input
            id="trips-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={text.searchPlaceholder}
            autoComplete="off"
            className={`${INPUT} pl-12`}
          />
        </div>

        {years.length > 1 && (
          <div
            role="group"
            aria-label={text.yearLabel}
            className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:px-0"
          >
            {yearOptions.map((option) => {
              const selected = option === year;
              return (
                <button
                  key={option ?? "all"}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onYearChange(option)}
                  className={`${choiceClass(selected)} shrink-0 tabular-nums`}
                >
                  {selected && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
                  {option ?? text.allYears}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
