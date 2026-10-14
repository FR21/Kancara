import { type KeyboardEvent, useRef } from "react";
import type { ItineraryDay } from "@/lib/client/captain";
import { parseLocalDate } from "@/lib/plan-draft";

type DayChipsProps = {
  days: ItineraryDay[];
  selected: number;
  /** Today's date as YYYY-MM-DD, marked with a dot. Null when no day of the trip is today. */
  today: string | null;
  locale: string;
  label: string;
  todayLabel: string;
  panelId: string;
  tabId: (index: number) => string;
  onSelect: (index: number) => void;
};

const CHIP =
  "relative inline-flex h-11 shrink-0 cursor-pointer items-center rounded-full px-4 text-label whitespace-nowrap tabular-nums transition-[background-color,border-color,color,scale] duration-150 ease-out active:scale-[0.97]";

// The trip's days as one row of pills ("Sun 11") that scrolls sideways when it runs past the screen. The chosen
// day is filled teal; today carries a small dot. Arrow keys move between days, as in any row of tabs.
export default function DayChips({ days, selected, today, locale, label, todayLabel, panelId, tabId, onSelect }: DayChipsProps) {
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const dayOfMonth = new Intl.DateTimeFormat(locale, { day: "numeric" });

  const moveTo = (index: number) => {
    const next = (index + days.length) % days.length;
    onSelect(next);
    const chip = chipRefs.current[next];
    chip?.scrollIntoView({ block: "nearest", inline: "center" });
    chip?.focus({ preventScroll: true });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    moveTo(selected + (event.key === "ArrowRight" ? 1 : -1));
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="-mx-surface flex gap-2 overflow-x-auto px-surface py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {days.map((day, index) => {
        const active = index === selected;
        const date = parseLocalDate(day.date);
        const isToday = day.date === today;
        return (
          <button
            key={day.date}
            ref={(element) => {
              chipRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={tabId(index)}
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(index)}
            onKeyDown={handleKeyDown}
            className={`${CHIP} ${active ? "bg-primary text-on-primary" : "border border-border-strong text-text hover:bg-surface-muted"}`}
          >
            {weekday.format(date)} {dayOfMonth.format(date)}
            {isToday && (
              <>
                <span
                  aria-hidden="true"
                  className={`absolute top-2 right-2 size-1.5 rounded-full ${active ? "bg-on-primary" : "bg-accent"}`}
                />
                <span className="sr-only">, {todayLabel}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
