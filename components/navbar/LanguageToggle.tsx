"use client";

import type { CSSProperties } from "react";
import { LOCALES, LOCALE_NAMES } from "@/lib/locale";
import { setLocale, useLocale } from "@/lib/use-locale";

export default function LanguageToggle({ label }: { label: string }) {
  const locale = useLocale();
  const index = LOCALES.indexOf(locale);

  return (
    <div
      role="group"
      aria-label={label}
      style={{ "--thumb-index": index } as CSSProperties}
      className="relative grid grid-cols-2 rounded-md border border-border p-0.5"
    >
      {/* Sliding thumb behind the selected option */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] translate-x-[calc(var(--thumb-index)*100%)] rounded-sm bg-primary-subtle ring-1 ring-primary/30 ring-inset transition-[translate] duration-250 ease-[cubic-bezier(0.77,0,0.175,1)] motion-reduce:transition-none"
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
            className={`relative h-10 w-12 cursor-pointer rounded-sm text-label transition-[color,scale] duration-150 ease-out active:scale-[0.97] md:h-8 md:w-10 ${
              selected ? "text-on-primary-subtle" : "text-text-muted hover:text-text"
            }`}
          >
            {option.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
