import { Car, Check, ChevronRight, Star, TriangleAlert } from "lucide-react";
import type { ItineraryItem } from "@/lib/api/captain";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { plural } from "@/lib/trips/format";

/** Where a stop stands against the clock on the day it happens. */
export type StopPhase = "done" | "now" | "next";

type ItineraryStopProps = {
  item: ItineraryItem;
  phase: StopPhase | null;
  order: number;
  isLast: boolean;
  locale: string;
  text: Messages["plan"]["itinerary"];
  describeCover: (cover: ItineraryItem["covers"][number]) => string;
  onOpen: () => void;
};

const TIME_RANGE = /^\s*(\d{1,2}[:.]\d{2})\s*(?:[-–—]|to|sampai)\s*(\d{1,2}[:.]\d{2})\s*$/i;
const CLOCK = /^(\d{1,2})[:.](\d{2})$/;
const MAX_COVERS = 2;
const CHIP = "inline-flex items-center gap-1 rounded-full px-2 py-1 text-caption font-bold";
const ENTER_STEP_MS = 60;
const MAX_STAGGER = 8;

// The planner writes times as free text, usually "09:00 - 12:00". Anything
// else is shown as it came.
export function splitTime(time: string): { start: string; end: string } {
  const match = TIME_RANGE.exec(time);
  return match ? { start: match[1], end: match[2] } : { start: time.trim(), end: "" };
}

/** Minutes since midnight for "09:30", or null when the text is not a clock time. */
export function toMinutes(clock: string): number | null {
  const match = CLOCK.exec(clock.trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** "2 hr 30 min" in the reader's language, or an empty string when the stop has no usable end time. */
export function formatDuration(time: string, text: Messages["plan"]["itinerary"]): string {
  const { start, end } = splitTime(time);
  const from = toMinutes(start);
  const until = toMinutes(end);
  if (from === null || until === null || until <= from) return "";
  const hours = Math.floor((until - from) / 60);
  const minutes = (until - from) % 60;
  return [
    hours > 0 ? fillTemplate(text.hours, { count: hours }) : "",
    minutes > 0 ? fillTemplate(text.minutes, { count: minutes }) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function StopCovers({
  item,
  label,
  describeCover,
}: Pick<ItineraryStopProps, "item" | "describeCover"> & { label: string }) {
  if (item.covers.length === 0) return null;
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {item.covers.map((cover) => (
        <li key={cover.need} className={`${CHIP} bg-success-subtle text-on-success-subtle`}>
          <Check className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
          {describeCover(cover)}
        </li>
      ))}
    </ul>
  );
}

export function StopViolations({ item, label }: { item: ItineraryItem; label: string }) {
  if (!item.violations || item.violations.length === 0) return null;
  return (
    <div className="rounded-2xl bg-warning-subtle px-4 py-3 text-body-sm text-on-warning-subtle">
      <p className="flex items-center gap-2 text-label">
        <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
        {label}
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-6">
        {item.violations.map((violation) => (
          <li key={`${violation.need}-${violation.reason}`}>{violation.reason}</li>
        ))}
      </ul>
    </div>
  );
}

export function PhaseBadge({ phase, text }: { phase: StopPhase; text: Messages["plan"]["itinerary"] }) {
  if (phase === "now") {
    return (
      <span className={`${CHIP} bg-primary text-on-primary`}>
        <span aria-hidden="true" className="size-2 rounded-full bg-accent motion-safe:animate-signal" />
        {text.now}
      </span>
    );
  }
  if (phase === "next") {
    return <span className={`${CHIP} border border-primary text-primary`}>{text.next}</span>;
  }
  return (
    <span className={`${CHIP} border border-border-strong text-text-muted`}>
      <Check className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
      {text.done}
    </span>
  );
}

// One block on the day's schedule. The time and length sit on the axis at the
// left; the block names the stop and opens its details.
export default function ItineraryStop({
  item,
  phase,
  order,
  isLast,
  locale,
  text,
  describeCover,
  onOpen,
}: ItineraryStopProps) {
  const { start } = splitTime(item.time);
  const duration = formatDuration(item.time, text);
  const toCheck = item.violations?.length ?? 0;
  const shownCovers = item.covers.slice(0, MAX_COVERS);
  const hiddenCovers = item.covers.length - shownCovers.length;
  const hasChips = phase !== null || item.covers.length > 0 || toCheck > 0 || item.rating !== undefined;
  const dot = phase === "now" ? "size-3 bg-primary ring-4 ring-primary/25" : "size-2 bg-border-strong";

  return (
    <li
      style={{ animationDelay: `${Math.min(order, MAX_STAGGER) * ENTER_STEP_MS}ms` }}
      className="group/slot grid grid-cols-[4rem_minmax(0,1fr)] motion-safe:animate-message-in sm:grid-cols-[5.5rem_minmax(0,1fr)]"
    >
      <div className="relative border-r border-border pt-4 pr-3 text-right sm:pr-4">
        <p className={`text-label tabular-nums ${phase === "done" ? "text-text-muted" : "text-text"}`}>{start}</p>
        {duration && <p className="mt-1 text-caption text-text-muted tabular-nums">{duration}</p>}
        <span
          aria-hidden="true"
          className={`absolute top-6 right-0 translate-x-1/2 -translate-y-1/2 rounded-full transition-[background-color,scale] duration-300 ease-spring group-hover/slot:scale-150 group-hover/slot:bg-primary ${dot}`}
        />
      </div>

      <div className={`min-w-0 pl-3 sm:pl-5 ${isLast ? "" : "pb-3"}`}>
        <button
          type="button"
          onClick={onOpen}
          className={`group/stop block w-full cursor-pointer rounded-2xl border bg-background p-3 text-left transition-[border-color,scale] duration-150 ease-out hover:border-primary active:scale-[0.99] sm:p-4 ${
            phase === "now" ? "border-primary" : "border-border"
          }`}
        >
          <span className="flex items-start gap-3">
            <span className="min-w-0 flex-1">
              <span className={`block text-label-lg text-pretty ${phase === "done" ? "text-text-muted" : "text-text"}`}>
                {item.title}
              </span>
              {item.detail && (
                <span className="mt-1 line-clamp-2 text-body-sm text-pretty text-text-muted">{item.detail}</span>
              )}
            </span>
            {item.imageUrl && (
              <span className="hidden size-16 shrink-0 overflow-clip rounded-xl bg-surface-muted sm:block">
                {/* eslint-disable-next-line @next/next/no-img-element -- place photos come from a remote API with per-request URLs */}
                <img
                  src={item.imageUrl}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition-[scale] duration-500 ease-out group-hover/stop:scale-110"
                />
              </span>
            )}
            <ChevronRight
              className="mt-1 size-4 shrink-0 text-text-muted transition-[translate,color] duration-200 ease-out group-hover/stop:translate-x-1 group-hover/stop:text-primary"
              aria-hidden="true"
            />
          </span>

          {hasChips && (
            <span className="mt-3 flex flex-wrap items-center gap-2">
              {phase !== null && <PhaseBadge phase={phase} text={text} />}
              {shownCovers.map((cover) => (
                <span key={cover.need} className={`${CHIP} bg-success-subtle text-on-success-subtle`}>
                  <Check className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
                  {describeCover(cover)}
                </span>
              ))}
              {hiddenCovers > 0 && (
                <span className={`${CHIP} bg-success-subtle text-on-success-subtle tabular-nums`}>
                  {fillTemplate(text.more, { count: hiddenCovers })}
                </span>
              )}
              {toCheck > 0 && (
                <span className={`${CHIP} bg-warning-subtle text-on-warning-subtle tabular-nums`}>
                  <TriangleAlert className="size-3 shrink-0" aria-hidden="true" />
                  {plural(text.toCheck, toCheck, locale)}
                </span>
              )}
              {item.rating !== undefined && (
                <span className="inline-flex items-center gap-1 text-caption text-text-muted tabular-nums">
                  <Star className="size-3 fill-primary text-primary" aria-hidden="true" />
                  {fillTemplate(text.rating, { rating: item.rating })}
                </span>
              )}
            </span>
          )}
        </button>

        {!isLast && item.travelToNext && (
          <p className="flex items-center gap-2 px-1 pt-3 text-caption text-text-muted tabular-nums">
            <Car className="size-4 shrink-0" aria-hidden="true" />
            {fillTemplate(text.leg, {
              duration: item.travelToNext.duration,
              distance: item.travelToNext.distance,
            })}
          </p>
        )}
      </div>
    </li>
  );
}
