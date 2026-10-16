"use client";

import { Check, ChevronDown } from "lucide-react";
import { type KeyboardEvent, useId, useRef, useState } from "react";
import { INPUT } from "@/components/ui/styles";
import { countryNames } from "@/lib/travel/countries";
import { searchCountries } from "@/lib/travel/country-search";
import { useLocale } from "@/lib/use-locale";

type CountryPickerProps = {
  id: string;
  /** The chosen country's code, or an empty string for none. */
  value: string;
  placeholder: string;
  /** Said in the list when nothing answers what was typed. */
  emptyLabel: string;
  /** Countries left out of the list, for a picker that adds to a set already chosen. */
  exclude?: string[];
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
  onChange: (code: string) => void;
  onBlur?: () => void;
};

const MAX_SHOWN = 50;

// One field for every place a country is chosen. Typing narrows the list; the search forgives a slip or two and
// knows each country by its name in the page's language and in English. It is a combobox, so it works from the
// keyboard: the arrows move through the list, Enter takes one, Escape closes it.
export default function CountryPicker({
  id,
  value,
  placeholder,
  emptyLabel,
  exclude,
  disabled,
  invalid,
  describedBy,
  className = "",
  onChange,
  onBlur,
}: CountryPickerProps) {
  const locale = useLocale();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // What is being typed, or null while the field simply shows the chosen country.
  const [typed, setTyped] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const chosenName = value ? (countryNames(locale).get(value) ?? value) : "";
  const choices = open ? searchCountries(typed ?? "", locale, exclude).slice(0, MAX_SHOWN) : [];
  const current = Math.min(active, Math.max(choices.length - 1, 0));

  const close = () => {
    setOpen(false);
    setTyped(null);
    setActive(0);
  };
  const pick = (code: string) => {
    onChange(code);
    close();
  };
  const move = (step: number) => {
    if (!open) return setOpen(true);
    const next = (current + step + choices.length) % Math.max(choices.length, 1);
    setActive(next);
    listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
  };

  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" && open) {
      // Enter takes the country; it must not also send the form the field sits in.
      event.preventDefault();
      if (choices[current]) pick(choices[current].code);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && choices[current] ? `${listId}-${choices[current].code}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        value={typed ?? chosenName}
        placeholder={placeholder}
        onFocus={(event) => {
          setOpen(true);
          event.target.select();
        }}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setTyped(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={handleKey}
        onBlur={() => {
          // A field emptied by hand means "no country".
          if (typed !== null && typed.trim() === "" && value !== "") onChange("");
          close();
          onBlur?.();
        }}
        className={`${INPUT} pr-12 disabled:cursor-not-allowed aria-invalid:border-error`}
      />
      <ChevronDown
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-text-muted transition-[rotate] duration-200 ease-out ${open ? "rotate-180" : ""}`}
      />
      {open && (
        <div
          // Pressing in the list must not take the focus from the field, or the list would close before the press lands.
          onMouseDown={(event) => event.preventDefault()}
          className="absolute inset-x-0 top-full z-30 mt-2 origin-top overflow-clip surface-compact rounded-surface border border-border bg-background py-surface shadow-lg shadow-neutral-950/10 motion-safe:animate-pop-in"
        >
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="max-h-64 overflow-y-auto overscroll-contain px-surface [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]"
        >
          {choices.length === 0 && <li className="px-3 py-3 text-body-sm text-text-muted">{emptyLabel}</li>}
          {choices.map((choice, index) => (
            <li
              key={choice.code}
              id={`${listId}-${choice.code}`}
              role="option"
              aria-selected={choice.code === value}
              onMouseEnter={() => setActive(index)}
              onClick={() => pick(choice.code)}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-body-sm text-text transition-[background-color,scale] duration-150 ease-out active:scale-[0.99] ${
                index === current ? "bg-primary-subtle" : ""
              }`}
            >
              <span className="min-w-0 flex-1 text-pretty">{choice.name}</span>
              {choice.code === value && <Check className="size-4 shrink-0 text-primary" strokeWidth={3} aria-hidden="true" />}
            </li>
          ))}
        </ul>
        </div>
      )}
    </div>
  );
}
