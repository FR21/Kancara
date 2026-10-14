"use client";

import { ChevronRight, TriangleAlert } from "lucide-react";
import type { CSSProperties, KeyboardEvent } from "react";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { formatDays, formatDaysAhead, formatTripDates } from "@/lib/trips/format";
import { type TripCard, DRAFT_SECTIONS } from "@/lib/trips/trip";
import { useLocale } from "@/lib/use-locale";
import { StatusMark } from "./TripBadges";

export type TripListSection = { key: string; title: string | null; cards: TripCard[] };

type TripListProps = {
  sections: TripListSection[];
  selectedId: string | null;
  text: Messages["trips"];
  onSelect: (card: TripCard) => void;
};

type TripRowProps = {
  card: TripCard;
  /** Its place in the list, so the rows arrive one after another. */
  order: number;
  selected: boolean;
  text: Messages["trips"];
  onSelect: (card: TripCard) => void;
};

export function tripRowId(id: string): string {
  return `trip-${id}`;
}

function TripRow({ card, order, selected, text, onSelect }: TripRowProps) {
  const locale = useLocale();
  const route = [card.origin, card.destinations.join(", ")].filter(Boolean).join(" → ");
  const title = card.name || route || text.card.untitled;
  const dates = card.startDate ? formatTripDates(card.startDate, card.endDate, locale) : text.card.noDates;
  const subtitle = [card.name ? route : "", dates].filter(Boolean).join(" · ");

  const meta = () => {
    if (card.status === "ongoing") return fillTemplate(text.card.dayShort, { day: card.day ?? 1, total: card.days });
    if (card.status === "draft") {
      return fillTemplate(text.card.filledShort, { done: card.filled ?? 0, total: DRAFT_SECTIONS });
    }
    if (card.status === "upcoming" && card.startsIn !== undefined) return formatDaysAhead(card.startsIn, locale);
    return card.days > 0 ? formatDays(card.days, locale) : "";
  };

  return (
    <li
      style={{ "--item-index": order } as CSSProperties}
      className={`group/row relative transition-colors duration-200 ease-out hover:bg-surface-muted active:bg-surface-muted motion-safe:animate-list-in ${selected ? "lg:bg-primary-subtle lg:hover:bg-primary-subtle" : ""}`}
    >
      <div className="flex items-center gap-3 px-surface py-3">
        <StatusMark status={card.status} label={text.status[card.status]} />
        <div className="min-w-0 flex-1">
          {/* The button's ::after covers the row, so the whole row selects the trip. */}
          <button
            type="button"
            id={tripRowId(card.id)}
            aria-current={selected ? "true" : undefined}
            onClick={() => onSelect(card)}
            className="block max-w-full cursor-pointer truncate text-left text-label-lg text-text after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-primary"
          >
            {title}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 basis-full truncate text-body-sm text-text-muted tabular-nums sm:flex-1 sm:basis-0">
              {subtitle}
            </p>
            {card.violations !== undefined && card.violations > 0 && (
              <span title={text.card.toCheck} className="shrink-0 text-warning">
                <TriangleAlert className="size-4" aria-hidden="true" />
                <span className="sr-only">{text.card.toCheck}</span>
              </span>
            )}
            <p
              className={`shrink-0 text-label tabular-nums ${card.status === "ongoing" ? "text-primary" : "text-text"}`}
            >
              {meta()}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <span
            aria-hidden="true"
            className={`flex size-6 items-center justify-center rounded-full transition-[background-color,color,translate,scale] duration-200 ease-out group-hover/row:translate-x-1 ${
              selected ? "text-text-muted lg:scale-110 lg:bg-primary lg:text-on-primary" : "text-text-muted"
            }`}
          >
            <ChevronRight className="size-4" />
          </span>
        </div>
      </div>

    </li>
  );
}

// The left side of My Trips: every trip as one row, grouped by where it stands.
export default function TripList({ sections, selectedId, text, onSelect }: TripListProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const rows = [...event.currentTarget.querySelectorAll<HTMLElement>("button[id^='trip-']")];
    const current = rows.findIndex((row) => row === document.activeElement);
    if (current === -1) return;
    event.preventDefault();
    rows[current + (event.key === "ArrowDown" ? 1 : -1)]?.focus();
  };

  return (
    <div
      role="group"
      aria-label={text.list.label}
      onKeyDown={handleKeyDown}
      className="overflow-clip rounded-surface border border-border bg-surface"
    >
      {sections.map((section, index) => (
        <section key={section.key} className={index > 0 ? "border-t border-border" : ""}>
          {section.title && (
            <h2 className="flex items-baseline justify-between gap-3 px-surface pt-4 pb-1 font-sans text-label text-text-muted">
              {section.title}
              <span className="tabular-nums">{section.cards.length}</span>
            </h2>
          )}
          <ul className="divide-y divide-border">
            {section.cards.map((card, row) => (
              <TripRow key={card.id} card={card} order={row} selected={card.id === selectedId} text={text} onSelect={onSelect} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
