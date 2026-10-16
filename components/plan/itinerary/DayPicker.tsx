"use client";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import IconButton from "@/components/ui/IconButton";
import type { ItineraryDay } from "@/lib/client/captain";
import type { Messages } from "@/lib/messages";
import { fillTemplate, parseLocalDate } from "@/lib/plan-draft";

type DayPickerProps = {
  days: ItineraryDay[];
  selected: number;
  /** Today's date as YYYY-MM-DD, marked with a dot. Null when no day of the trip is today. */
  today: string | null;
  locale: string;
  text: Messages["plan"]["itinerary"]["picker"];
  onSelect: (index: number) => void;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK = 7;

/** YYYY-MM-DD of a local date, the form the trip's days are kept in. */
function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The first of the month that holds `date`, as a key ("2026-10"). */
function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// The month's grid from Monday, the first day of the week in Indonesia: blanks before the 1st, then each date.
function monthCells(key: string): (Date | null)[] {
  const [year, month] = key.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const length = new Date(year, month, 0).getDate();
  const leading = (first.getDay() + WEEK - 1) % WEEK;
  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length }, (_, offset) => new Date(year, month - 1, offset + 1)),
  ];
}

// The trip's days as one control: a step back, the chosen date, a step forward. The date opens a month calendar
// in which only the trip's own days can be picked, so a trip of two weeks is one tap from any of its days instead
// of a long row to scroll. The arrow keys move a day (or a week) at a time inside the calendar, as in any date
// picker; Escape or a press outside closes it.
export default function DayPicker({ days, selected, today, locale, text, onSelect }: DayPickerProps) {
  const popoverId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const [open, setOpen] = useState(false);
  const [focusDate, setFocusDate] = useState(days[selected]?.date ?? "");
  const [shownMonth, setShownMonth] = useState(() => monthKey(parseLocalDate(days[selected]?.date ?? isoDate(new Date()))));

  const indexOf = new Map(days.map((day, index) => [day.date, index]));
  const months = [...new Set(days.map((day) => monthKey(parseLocalDate(day.date))))];
  const monthPlace = months.indexOf(shownMonth);
  const current = days[selected];
  const shortDate = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" });
  const longDate = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });
  const monthTitle = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const weekdayName = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  // 5 January 2026 was a Monday; the row of weekday letters starts there.
  const weekdays = Array.from({ length: WEEK }, (_, offset) => weekdayName.format(new Date(2026, 0, 5 + offset)));

  const openCalendar = () => {
    const date = current?.date ?? "";
    setFocusDate(date);
    setShownMonth(monthKey(parseLocalDate(date)));
    setOpen(true);
  };

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  // The day that holds the keyboard's place takes the focus whenever it moves, the moment the calendar opens too.
  useEffect(() => {
    if (open) cellRefs.current.get(focusDate)?.focus();
  }, [open, focusDate, shownMonth]);

  const pick = (index: number) => {
    onSelect(index);
    close(true);
  };

  const step = (offset: number) => {
    const next = selected + offset;
    if (next >= 0 && next < days.length) onSelect(next);
  };

  // Moves the keyboard's place by a number of days, skipping dates outside the trip, and turns the month with it.
  const moveFocus = (offset: number) => {
    let date = parseLocalDate(focusDate);
    for (let tries = 0; tries < days.length + WEEK; tries += 1) {
      date = new Date(date.getTime() + offset * DAY_MS + DAY_MS / 2);
      date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const key = isoDate(date);
      if (indexOf.has(key)) {
        setFocusDate(key);
        setShownMonth(monthKey(date));
        return;
      }
      if (key < days[0].date || key > days[days.length - 1].date) return;
    }
  };

  const handleGridKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: WEEK, ArrowUp: -WEEK };
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    const offset = moves[event.key];
    if (offset === undefined) return;
    event.preventDefault();
    moveFocus(offset);
  };

  return (
    // The calendar is placed against the nearest positioned parent (the day header), under its right edge, so it
    // opens in view whether the pill sits at the end of the header or has wrapped to a line of its own.
    <div ref={rootRef} className="flex">
      {/* Padded like the travel map's zoom: two 36px steps and the date inside one 44px pill. */}
      <div className="inline-flex items-center rounded-full border border-border-strong bg-background p-1">
        <IconButton label={text.previous} size="small" disabled={selected === 0} onClick={() => step(-1)}>
          <ChevronLeft className="size-5" aria-hidden="true" />
        </IconButton>
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          aria-label={fillTemplate(text.choose, { date: current ? longDate.format(parseLocalDate(current.date)) : "" })}
          onClick={() => (open ? close(false) : openCalendar())}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full px-3 text-label text-text tabular-nums transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.97]"
        >
          <CalendarDays className="size-4 text-primary" aria-hidden="true" />
          {current && shortDate.format(parseLocalDate(current.date))}
          <ChevronDown
            className={`size-4 text-text-muted transition-[rotate] duration-200 ease-out ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
        <IconButton label={text.next} size="small" disabled={selected === days.length - 1} onClick={() => step(1)}>
          <ChevronRight className="size-5" aria-hidden="true" />
        </IconButton>
      </div>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={text.calendar}
          className={`absolute top-full right-0 z-30 mt-2 origin-top-right w-[min(21.5rem,calc(100vw-2rem))] surface-compact rounded-surface border border-border bg-background p-surface shadow-lg shadow-neutral-950/10 motion-safe:animate-pop-in`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="pl-2 text-label-lg text-text first-letter:uppercase" aria-live="polite">
              {monthTitle.format(parseLocalDate(`${shownMonth}-01`))}
            </p>
            {months.length > 1 && (
              <div className="flex">
                <IconButton
                  label={text.previousMonth}
                  size="small"
                  disabled={monthPlace <= 0}
                  onClick={() => setShownMonth(months[monthPlace - 1])}
                >
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </IconButton>
                <IconButton
                  label={text.nextMonth}
                  size="small"
                  disabled={monthPlace >= months.length - 1}
                  onClick={() => setShownMonth(months[monthPlace + 1])}
                >
                  <ChevronRight className="size-5" aria-hidden="true" />
                </IconButton>
              </div>
            )}
          </div>

          <div aria-hidden="true" className="mt-2 grid grid-cols-7 text-center text-caption text-text-muted">
            {weekdays.map((name, position) => (
              <span key={position} className="py-1">
                {name}
              </span>
            ))}
          </div>
          {/* Arrow keys move inside this grid; the focused day is the only one in the tab order. */}
          <div className="grid grid-cols-7 gap-y-1" onKeyDown={handleGridKey}>
            {monthCells(shownMonth).map((date, position) => {
              if (!date) return <span key={`blank-${position}`} />;
              const key = isoDate(date);
              const index = indexOf.get(key);
              const inTrip = index !== undefined;
              const chosen = index === selected;
              return (
                <button
                  key={key}
                  ref={(element) => {
                    if (element) cellRefs.current.set(key, element);
                    else cellRefs.current.delete(key);
                  }}
                  type="button"
                  disabled={!inTrip}
                  tabIndex={key === focusDate ? 0 : -1}
                  aria-current={chosen ? "date" : undefined}
                  aria-label={
                    inTrip
                      ? `${fillTemplate(text.dayLabel, { number: index + 1 })}, ${longDate.format(date)}${key === today ? `, ${text.today}` : ""}`
                      : longDate.format(date)
                  }
                  onClick={() => inTrip && pick(index)}
                  onFocus={() => setFocusDate(key)}
                  className={`relative mx-auto flex aspect-square w-full max-w-11 items-center justify-center rounded-full text-label tabular-nums transition-[background-color,color,scale] duration-150 ease-out ${
                    chosen ? "bg-primary text-on-primary" : ""
                  } ${inTrip && !chosen ? "cursor-pointer bg-primary-subtle/60 text-text hover:bg-primary-subtle active:scale-[0.95]" : ""} ${
                    inTrip ? "" : "cursor-default text-text-muted/50"
                  }`}
                >
                  {date.getDate()}
                  {key === today && (
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full ${chosen ? "bg-on-primary" : "bg-accent"}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
