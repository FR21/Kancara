"use client";

import type { CSSProperties } from "react";
import { LOCALES, LOCALE_NAMES } from "@/lib/locale";
import { setLocale, useLocale } from "@/lib/use-locale";

// The same pill with a sliding teal thumb that the rest of the app uses for a choice between two.
export default function LanguageToggle({ label }: { label: string }) {
  const locale = useLocale();
  const index = LOCALES.indexOf(locale);

  return (
    <div
      role="group"
      aria-label={label}
      style={{ "--thumb-index": index } as CSSProperties}
      className="relative grid grid-cols-2 rounded-full border border-border-strong p-1 transition-colors duration-300 group-data-over-hero/nav:border-neutral-50/40"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] translate-x-[calc(var(--thumb-index)*100%)] rounded-full bg-primary transition-[translate,background-color] duration-250 ease-[cubic-bezier(0.77,0,0.175,1)] group-data-over-hero/nav:bg-neutral-50 motion-reduce:transition-none"
      />
      {LOCALES.map((option) => {
        const selected = option === locale;
        return (
          <button
            key={option}
            type="button"
            lang={option}
            aria-label={LOCALE_NAMES[option]}
            aria-pressed={selected}
            onClick={() => setLocale(option)}
            className={`relative h-11 w-12 cursor-pointer rounded-full text-label transition-[color,scale] duration-150 ease-out active:scale-[0.97] md:h-8 md:w-10 ${
              selected
                ? "text-on-primary group-data-over-hero/nav:text-neutral-950"
                : "text-text-muted hover:text-text group-data-over-hero/nav:text-neutral-50/80 group-data-over-hero/nav:hover:text-neutral-50"
            }`}
          >
            {option.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
