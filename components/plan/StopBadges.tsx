import { Check, TriangleAlert, WashingMachine } from "lucide-react";
import type { ErrandKind, ItineraryItem } from "@/lib/client/captain";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { splitTime, toMinutes } from "@/lib/stop-time";
import { BADGE } from "@/components/ui/styles";

/** Where a stop stands against the clock on the day it happens. */
export type StopPhase = "done" | "now" | "next";

/** Says who a met need is met for, for a stop's badges and details. */
export type DescribeCover = (cover: ItineraryItem["covers"][number]) => string;

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
}: { describeCover: DescribeCover; item: Pick<ItineraryItem, "covers">; label: string }) {
  if (item.covers.length === 0) return null;
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {item.covers.map((cover) => (
        <li key={cover.need} title={describeCover(cover)} className={`${BADGE} bg-success-subtle text-on-success-subtle`}>
          <Check className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
          <span className="truncate">{describeCover(cover)}</span>
        </li>
      ))}
    </ul>
  );
}

type StopViolationsProps = {
  item: Pick<ItineraryItem, "violations">;
  label: string;
  /** Drawn as a tinted box, except inside a box of its own (a backup), where a box in a box would crowd it. */
  boxed?: boolean;
};

export function StopViolations({ item, label, boxed = true }: StopViolationsProps) {
  if (!item.violations || item.violations.length === 0) return null;
  return (
    <div className={`text-body-sm ${boxed ? "rounded-lg bg-warning-subtle px-4 py-3 text-on-warning-subtle" : "text-text"}`}>
      <p className="flex items-center gap-2 text-label">
        <TriangleAlert className={`size-4 shrink-0 ${boxed ? "" : "text-warning"}`} aria-hidden="true" />
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

/** Names a stop the group runs as an errand, so it does not read as a place to visit. */
export function ErrandBadge({ kind, text }: { kind: ErrandKind; text: Messages["plan"]["itinerary"] }) {
  return (
    <span className={`${BADGE} bg-surface-muted text-text`}>
      <WashingMachine className="size-3 shrink-0" aria-hidden="true" />
      {text.errands[kind]}
    </span>
  );
}

export function PhaseBadge({ phase, text }: { phase: StopPhase; text: Messages["plan"]["itinerary"] }) {
  if (phase === "now") {
    return (
      <span className={`${BADGE} bg-primary text-on-primary`}>
        <span aria-hidden="true" className="size-2 rounded-full bg-accent motion-safe:animate-signal" />
        {text.now}
      </span>
    );
  }
  if (phase === "next") {
    return <span className={`${BADGE} border border-primary text-primary`}>{text.next}</span>;
  }
  return (
    <span className={`${BADGE} border border-border-strong text-text-muted`}>
      <Check className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
      {text.done}
    </span>
  );
}
