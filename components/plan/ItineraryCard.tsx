"use client";

import { Check, ChevronRight, TriangleAlert } from "lucide-react";
import { type KeyboardEvent, useId, useRef, useState } from "react";
import type { Itinerary, ItineraryCover, ItineraryDay } from "@/lib/api/captain";
import type { Messages } from "@/lib/messages";
import { type Member, fillTemplate, getMemberName, parseLocalDate } from "@/lib/plan-draft";
import { plural } from "@/lib/trips/format";
import { useLocale } from "@/lib/use-locale";
import { useWibNow } from "@/lib/use-wib-now";
import ItineraryStop, { type StopPhase, splitTime, toMinutes } from "./ItineraryStop";
import StopDialog from "./StopDialog";

type ItineraryCardProps = {
  itinerary: Itinerary;
  destination: string;
  members: Member[];
  text: Messages["plan"];
  isSample: boolean;
  /** The day to open on, as YYYY-MM-DD. Falls back to the first day. */
  initialDate?: string;
  /** For a trip in progress: mark what is done, happening now, and up next on today's schedule. */
  live?: boolean;
};

const MAX_NAMES = 2;
const NEXT_KEYS = ["ArrowRight", "ArrowDown"];
const PREVIOUS_KEYS = ["ArrowLeft", "ArrowUp"];

// One tab serves both layouts: a pill in a scrolling row on a phone, a full
// row in the day column from 1024px.
const DAY_TAB =
  "inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 text-left whitespace-nowrap transition-[background-color,border-color,color,scale] duration-150 ease-out active:scale-[0.97] lg:h-auto lg:w-full lg:justify-between lg:rounded-xl lg:border-transparent lg:px-3 lg:py-3";
const DAY_TAB_ACTIVE = "border-primary bg-primary text-on-primary lg:bg-primary-subtle lg:text-text";
const DAY_TAB_IDLE = "border-border-strong text-text hover:bg-surface-muted";

// Where each stop stands against the clock. Only today's schedule gets phases;
// a stop without a readable time is left unmarked.
function readPhases(day: ItineraryDay, now: { date: string; time: string } | null): (StopPhase | null)[] {
  const minute = now && now.date === day.date ? toMinutes(now.time) : null;
  if (minute === null) return day.items.map(() => null);
  let nextFound = false;
  return day.items.map((item, index) => {
    const { start, end } = splitTime(item.time);
    const from = toMinutes(start);
    if (from === null) return null;
    const nextStart = day.items[index + 1] ? toMinutes(splitTime(day.items[index + 1].time).start) : null;
    const until = toMinutes(end) ?? nextStart ?? from;
    if (minute >= until && until > from) return "done";
    if (minute >= from) return minute < until ? "now" : "done";
    if (nextFound) return null;
    nextFound = true;
    return "next";
  });
}

function countToCheck(day: ItineraryDay): number {
  return day.items.reduce((count, item) => count + (item.violations?.length ?? 0), 0);
}

// The itinerary as a schedule: the days down the side, the chosen day's stops
// beside them in one aligned list.
export default function ItineraryCard({
  itinerary,
  destination,
  members,
  text,
  isSample,
  initialDate,
  live = false,
}: ItineraryCardProps) {
  const locale = useLocale();
  const baseId = useId();
  const [selected, setSelected] = useState(() =>
    Math.max(
      itinerary.days.findIndex((entry) => entry.date === initialDate),
      0,
    ),
  );
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const now = useWibNow(live);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const shortFormat = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" });
  const longFormat = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });
  const dayCount = itinerary.days.length;
  const day = itinerary.days[Math.min(selected, dayCount - 1)];
  const honoured = day.items.reduce((count, item) => count + item.covers.length, 0);
  const toCheck = countToCheck(day);
  const phases = readPhases(day, now);
  const dayName = (index: number) => fillTemplate(text.itinerary.day, { number: index + 1 });

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
    setSelected(index);
    setOpenIndex(null);
  };

  const moveTo = (index: number) => {
    const next = (index + dayCount) % dayCount;
    selectDay(next);
    const tab = tabRefs.current[next];
    tab?.scrollIntoView({ block: "nearest", inline: "center" });
    tab?.focus({ preventScroll: true });
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!NEXT_KEYS.includes(event.key) && !PREVIOUS_KEYS.includes(event.key)) return;
    event.preventDefault();
    moveTo(selected + (NEXT_KEYS.includes(event.key) ? 1 : -1));
  };

  return (
    <section className="overflow-clip rounded-2xl border border-border bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <h2 className="text-h3 text-text">{fillTemplate(text.itinerary.title, { destination })}</h2>
        {isSample && (
          <span className="shrink-0 rounded-full border border-border-strong px-2 py-1 text-caption font-bold text-text-muted">
            {text.itinerary.sample}
          </span>
        )}
      </header>

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div
          role="tablist"
          aria-label={text.itinerary.daysLabel}
          className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3 [scrollbar-width:none] sm:px-6 lg:flex-col lg:gap-1 lg:overflow-visible lg:border-r lg:border-b-0 lg:p-3"
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
                onClick={() => selectDay(index)}
                onKeyDown={handleTabKeyDown}
                className={`group/day ${DAY_TAB} ${active ? DAY_TAB_ACTIVE : DAY_TAB_IDLE}`}
              >
                {active && <Check className="size-4 shrink-0 lg:hidden" strokeWidth={3} aria-hidden="true" />}
                <span className="flex items-baseline gap-2 lg:flex-col lg:gap-0">
                  <span className="text-label lg:text-label-lg">{dayName(index)}</span>
                  <span className={`text-body-sm ${active ? "lg:text-text-muted" : "text-text-muted"}`}>
                    {shortFormat.format(parseLocalDate(entry.date))}
                  </span>
                </span>
                <span className="hidden items-center gap-2 lg:flex">
                  {countToCheck(entry) > 0 && (
                    <TriangleAlert className="size-4 shrink-0 text-warning" aria-hidden="true" />
                  )}
                  <span
                    aria-hidden="true"
                    className={`flex size-6 items-center justify-center rounded-full transition-[translate] duration-200 ease-out group-hover/day:translate-x-1 ${
                      active ? "bg-primary text-on-primary" : "text-text-muted"
                    }`}
                  >
                    <ChevronRight className="size-4" />
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${selected}`}
          className="min-w-0 px-4 pt-5 pb-5 sm:px-6 lg:px-8 lg:pt-6 lg:pb-8"
        >
          <div key={day.date} className="motion-safe:animate-message-in">
            <h3 className="text-h3 text-text">
              {dayName(selected)} · {longFormat.format(parseLocalDate(day.date))}
            </h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-text-muted tabular-nums">
              {plural(text.itinerary.stops, day.items.length, locale)}
              {honoured > 0 && (
                <span className="inline-flex items-center gap-1 text-success">
                  <Check className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
                  {plural(text.itinerary.honoured, honoured, locale)}
                </span>
              )}
              {toCheck > 0 && (
                <span className="inline-flex items-center gap-1 text-warning">
                  <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
                  {plural(text.itinerary.toCheck, toCheck, locale)}
                </span>
              )}
            </p>

            {day.items.length === 0 && (
              <p className="py-8 text-body-sm text-text-muted">{text.itinerary.emptyDay}</p>
            )}

            <ol className="mt-4">
              {day.items.map((item, index) => (
                <ItineraryStop
                  key={`${item.time}-${item.title}`}
                  item={item}
                  phase={phases[index]}
                  order={index}
                  isLast={index === day.items.length - 1}
                  locale={locale}
                  text={text.itinerary}
                  describeCover={describeCover}
                  onOpen={() => setOpenIndex(index)}
                />
              ))}
            </ol>
          </div>
        </div>
      </div>

      <StopDialog
        items={day.items}
        index={openIndex}
        phases={phases}
        dayLabel={dayName(selected)}
        destination={destination}
        text={text.itinerary}
        describeCover={describeCover}
        onNavigate={setOpenIndex}
        onClose={() => setOpenIndex(null)}
      />
    </section>
  );
}
