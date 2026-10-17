"use client";

import { History, Plane } from "lucide-react";
import type { KeyboardEvent } from "react";
import { EASE } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";

export const TRIP_TABS = ["active", "history"] as const;
export type TripTab = (typeof TRIP_TABS)[number];

export const TRIPS_PANEL_ID = "trips-panel";

type TripTabsProps = {
  tab: TripTab;
  text: Messages["trips"]["tabs"];
  onChange: (tab: TripTab) => void;
};

const ICONS = { active: Plane, history: History };

export function tripTabId(tab: TripTab): string {
  return `trips-tab-${tab}`;
}

export default function TripTabs({ tab, text, onChange }: TripTabsProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const next = tab === "active" ? "history" : "active";
    onChange(next);
    document.getElementById(tripTabId(next))?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={text.label}
      className="relative inline-grid w-fit shrink-0 grid-cols-2 rounded-full border border-border-strong bg-surface p-1"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary transition-[translate] duration-200 ${EASE} motion-reduce:transition-none ${
          tab === "history" ? "translate-x-full" : ""
        }`}
      />
      {TRIP_TABS.map((option) => {
        const Icon = ICONS[option];
        const selected = tab === option;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            id={tripTabId(option)}
            aria-selected={selected}
            aria-controls={TRIPS_PANEL_ID}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option)}
            onKeyDown={handleKeyDown}
            className={`relative inline-flex h-9 min-w-[5.75rem] cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-label whitespace-nowrap transition-[color,scale] duration-150 ease-out active:scale-[0.97] sm:min-w-[6.5rem] ${
              selected ? "text-on-primary font-bold" : "text-text-muted hover:text-text"
            }`}
          >
            {/* On a phone the words alone, so the views and the "Plan" button beside them fit one row. */}
            <Icon className="size-4 shrink-0 max-sm:hidden" aria-hidden="true" />
            {text[option]}
          </button>
        );
      })}
    </div>
  );
}
