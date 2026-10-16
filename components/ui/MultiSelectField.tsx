"use client";

import { Check, ChevronDown } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { INPUT } from "@/components/ui/styles";

export type MultiSelectGroup<Value extends string> = { label: string; options: { value: Value; label: string }[] };

type MultiSelectFieldProps<Value extends string> = {
  id: string;
  groups: MultiSelectGroup<Value>[];
  selected: readonly Value[];
  placeholder: string;
  /** What the closed field reads once something is picked, e.g. "{count} chosen". */
  summary: (count: number) => string;
  onToggle: (value: Value) => void;
  describedBy?: string;
};

// A field that opens a list of options, grouped under headings, where any number can be ticked. It reads like
// every other field when closed (8px corner, 48px tall) and its list is a compact surface under it. The arrow keys
// move through the options, Space or Enter ticks one, Escape or a click elsewhere closes the list.
export default function MultiSelectField<Value extends string>({
  id,
  groups,
  selected,
  placeholder,
  summary,
  onToggle,
  describedBy,
}: MultiSelectFieldProps<Value>) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const options = groups.flatMap((group) => group.options);
  const optionId = (index: number) => `${listId}-${index}`;

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // optionId only joins the list's id to the index.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + options.length) % options.length);
      return;
    }
    if ((event.key === " " || event.key === "Enter") && open) {
      event.preventDefault();
      const option = options[active];
      if (option) onToggle(option.value);
    }
  };

  // Where each group begins in the run of options, which the arrow keys walk as one list.
  const starts = groups.map((_, groupIndex) =>
    groups.slice(0, groupIndex).reduce((count, group) => count + group.options.length, 0),
  );
  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        aria-describedby={describedBy}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        className={`${INPUT} flex cursor-pointer items-center justify-between gap-3 pr-12 text-left`}
      >
        <span className={selected.length > 0 ? "text-text" : "text-text-muted"}>
          {selected.length > 0 ? summary(selected.length) : placeholder}
        </span>
      </button>
      <ChevronDown
        aria-hidden="true"
        className={`pointer-events-none absolute top-6 right-4 size-5 -translate-y-1/2 text-text-muted transition-[rotate] duration-200 ease-out ${open ? "rotate-180" : ""}`}
      />
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 origin-top overflow-clip surface-compact rounded-surface border border-border bg-background py-surface shadow-lg shadow-neutral-950/10 motion-safe:animate-pop-in">
          <ul
            id={listId}
            role="listbox"
            aria-multiselectable="true"
            // Pressing in the list keeps the focus on the field, so the keys go on working.
            onMouseDown={(event) => event.preventDefault()}
            className="max-h-72 overflow-y-auto overscroll-contain px-surface [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]"
          >
            {groups.map((group, groupIndex) => (
              <li key={group.label} role="presentation">
                <p className="px-3 pt-3 pb-1 text-caption font-bold text-text-muted">{group.label}</p>
                <ul role="group" aria-label={group.label}>
                  {group.options.map((option, optionIndex) => {
                    const index = starts[groupIndex] + optionIndex;
                    const ticked = selected.includes(option.value);
                    return (
                      <li
                        key={option.value}
                        id={optionId(index)}
                        role="option"
                        aria-selected={ticked}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => onToggle(option.value)}
                        className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-body-sm text-text transition-[background-color,scale] duration-150 ease-out active:scale-[0.99] ${
                          index === active ? "bg-primary-subtle" : ""
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-[background-color,border-color] duration-150 ease-out ${
                            ticked ? "border-primary bg-primary text-on-primary" : "border-border-strong"
                          }`}
                        >
                          {ticked && <Check className="size-4" strokeWidth={3.5} />}
                        </span>
                        {option.label}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
