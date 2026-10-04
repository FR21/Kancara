"use client";

import { Check } from "lucide-react";
import { type CSSProperties, type KeyboardEvent, useId, useRef, useState } from "react";
import type { Itinerary, ItineraryCover } from "@/lib/api/captain";
import type { Messages } from "@/lib/messages";
import { type Member, fillTemplate, getMemberName, parseLocalDate } from "@/lib/plan-draft";
import { useLocale } from "@/lib/use-locale";

type ItineraryCardProps = {
  itinerary: Itinerary;
  destination: string;
  members: Member[];
  text: Messages["plan"];
  isSample: boolean;
};

const MAX_NAMES = 2;

export default function ItineraryCard({ itinerary, destination, members, text, isSample }: ItineraryCardProps) {
  const locale = useLocale();
  const baseId = useId();
  const [selected, setSelected] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dayFormat = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric" });
  const dayCount = itinerary.days.length;
  const day = itinerary.days[selected];

  const describeCover = (cover: ItineraryCover) => {
    const covered = members.filter((member) => cover.memberIds.includes(member.id));
    if (covered.length === 0) return text.needs[cover.need];
    if (covered.length === members.length && members.length > 1) {
      return `${text.itinerary.everyone}: ${text.needs[cover.need]}`;
    }
    const names = covered.slice(0, MAX_NAMES).map((member) => getMemberName(member, members, text.ageGroups));
    const extra = covered.length > MAX_NAMES ? ` +${covered.length - MAX_NAMES}` : "";
    return `${names.join(", ")}${extra}: ${text.needs[cover.need]}`;
  };

  const selectDay = (index: number) => {
    const next = (index + dayCount) % dayCount;
    setSelected(next);
    tabRefs.current[next]?.focus();
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowRight") selectDay(selected + 1);
    if (event.key === "ArrowLeft") selectDay(selected - 1);
  };

  const tabTrackStyle = {
    gridTemplateColumns: `repeat(${dayCount}, minmax(4rem, 1fr))`,
    "--tab-index": selected,
    "--tab-count": dayCount,
  } as CSSProperties;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
        <h2 className="text-label-lg text-text">{fillTemplate(text.itinerary.title, { destination })}</h2>
        {isSample && (
          <span className="shrink-0 rounded-full border border-border-strong px-2 py-0.5 text-caption font-bold text-text-muted">
            {text.itinerary.sample}
          </span>
        )}
      </div>

      <div className="mt-3 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] sm:px-5">
        <div
          role="tablist"
          aria-label={text.itinerary.daysLabel}
          style={tabTrackStyle}
          className="relative grid min-w-max"
        >
          {itinerary.days.map((entry, index) => {
            const active = index === selected;
            return (
              <button
                key={entry.date}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${index}`}
                aria-selected={active}
                aria-controls={`${baseId}-panel`}
                tabIndex={active ? 0 : -1}
                onClick={() => setSelected(index)}
                onKeyDown={handleTabKeyDown}
                className={`flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-t-lg px-2 py-2 transition-colors duration-150 hover:bg-surface-muted ${
                  active ? "text-primary" : "text-text-muted"
                }`}
              >
                <span className="text-label">{fillTemplate(text.itinerary.day, { number: index + 1 })}</span>
                <span className="text-caption">{dayFormat.format(parseLocalDate(entry.date))}</span>
              </button>
            );
          })}
          <span
            aria-hidden="true"
            className="absolute bottom-0 left-0 h-0.5 w-[calc(100%/var(--tab-count))] translate-x-[calc(var(--tab-index)*100%)] rounded-full bg-primary transition-[translate] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
          />
        </div>
      </div>

      <ol
        key={day.date}
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${selected}`}
        className="divide-y divide-border px-4 motion-safe:animate-message-in sm:px-5"
      >
        {day.items.map((item) => (
          <li key={`${item.time}-${item.title}`} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 py-4">
            <p className="text-label text-primary tabular-nums">{item.time}</p>
            <div className="min-w-0">
              <p className="text-label text-text">{item.title}</p>
              {item.detail && <p className="mt-1 text-body-sm text-text-muted">{item.detail}</p>}
              {item.covers.length > 0 && (
                <ul aria-label={text.itinerary.honours} className="mt-2 flex flex-wrap gap-2">
                  {item.covers.map((cover) => (
                    <li
                      key={cover.need}
                      className="inline-flex items-center gap-1 rounded-full bg-success-subtle px-2 py-1 text-caption font-bold text-on-success-subtle"
                    >
                      <Check className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
                      {describeCover(cover)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
