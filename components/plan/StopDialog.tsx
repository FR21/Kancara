"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Car,
  Clock,
  ExternalLink,
  LifeBuoy,
  MapPin,
  Repeat2,
  Star,
  Wallet,
  X,
} from "lucide-react";
import { type KeyboardEvent, type MouseEvent, useEffect, useRef } from "react";
import type { ItineraryItem } from "@/lib/client/captain";
import { isLegCurrent, listBackups } from "@/lib/backups";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { splitTime } from "@/lib/stop-time";
import { plural } from "@/lib/trips/format";
import { useLocale } from "@/lib/use-locale";
import {
  type StopPhase,
  ErrandBadge,
  formatDuration,
  PhaseBadge,
  StopCovers,
  StopViolations,
} from "./StopBadges";
import StopBackups, { BACKUPS_ID } from "./StopBackups";
import IconButton from "@/components/ui/IconButton";
import { OUTLINE_BUTTON, TEXT_LINK } from "@/components/ui/styles";

type StopDialogProps = {
  items: ItineraryItem[];
  /** The stop being shown, or null while the sheet is closed. */
  index: number | null;
  phases: (StopPhase | null)[];
  dayLabel: string;
  destination: string;
  text: Messages["plan"]["itinerary"];
  /** False for a sample plan, whose places were never held against the group's needs. */
  validated: boolean;
  describeCover: (cover: ItineraryItem["covers"][number]) => string;
  /** Switches the open stop to one of its backups. Absent where the plan is only read. */
  onUseBackup?: (backupIndex: number) => void;
  onNavigate: (index: number) => void;
  onClose: () => void;
};

const STEP_BUTTON = `group ${OUTLINE_BUTTON} min-w-0 flex-1`;
const FACT_LABEL = "text-caption font-bold text-text-muted";
const SECTION_TITLE = "font-sans text-label text-text";

function mapsUrl(item: ItineraryItem, destination: string): string {
  // A laundry stop no place was found for opens a search for laundries around the destination.
  const query =
    item.errand && !item.address
      ? `laundry ${destination}`
      : [item.title, item.address || destination].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// A stop's details, drawn exactly as components/ui/Sheet is: a sheet rising from the bottom edge on a phone, a
// centred dialog from 640px. It is its own dialog because its photo runs edge to edge under the bar and it steps
// through the day's stops without closing, which Sheet's padded body and fixed title do not allow.
export default function StopDialog({
  items,
  index,
  phases,
  dayLabel,
  destination,
  text,
  validated,
  describeCover,
  onUseBackup,
  onNavigate,
  onClose,
}: StopDialogProps) {
  const locale = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const open = index !== null;
  const item = index === null ? null : (items[index] ?? null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Each stop starts at its top, whatever the last one was scrolled to.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [index]);

  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const step = (offset: number) => {
    if (index === null) return;
    const target = index + offset;
    if (target >= 0 && target < items.length) onNavigate(target);
  };

  // The slot now holds another place, so the sheet goes back to its top where that place is named.
  const switchBackup = (backupIndex: number) => {
    onUseBackup?.(backupIndex);
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "ArrowRight") step(1);
    if (event.key === "ArrowLeft") step(-1);
  };

  const time = item ? splitTime(item.time) : { start: "", end: "" };
  const duration = item ? formatDuration(item.time, text) : "";
  const phase = index === null ? null : (phases[index] ?? null);
  const nextItem = index === null ? undefined : items[index + 1];
  const standingBy = item ? listBackups(item).filter((backup) => backup.kind !== "main").length : 0;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="stop-dialog-title"
      onClose={onClose}
      onClick={closeOnBackdrop}
      onKeyDown={handleKeyDown}
      className="mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-surface bg-background p-0 text-text backdrop:bg-neutral-950/70 open:flex open:motion-safe:animate-sheet-up sm:m-auto sm:max-h-[86dvh] sm:max-w-xl sm:rounded-surface sm:open:motion-safe:animate-message-in"
    >
      {item && index !== null && (
        <>
          <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-strong sm:hidden" />
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border py-1 pr-2 pl-surface sm:py-2">
            <p className="min-w-0 truncate text-label text-text-muted tabular-nums">
              {dayLabel} · {fillTemplate(text.position, { current: index + 1, total: items.length })}
            </p>
            <IconButton label={text.close} onClick={onClose}>
              <X className="size-5" aria-hidden="true" />
            </IconButton>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin] motion-safe:scroll-smooth">
            {item.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- place photos come from a remote API with per-request URLs
              <img src={item.imageUrl} alt="" className="aspect-2/1 w-full bg-surface-muted object-cover sm:aspect-5/2" />
            )}

            <div key={index} className="space-y-6 p-surface motion-safe:animate-message-in">
              <div>
                <p className="text-label text-primary tabular-nums">
                  {time.start}
                  {time.end && ` – ${time.end}`}
                  {duration && <span className="text-text-muted"> · {duration}</span>}
                </p>
                <h2 id="stop-dialog-title" className="mt-1 text-h3 text-pretty text-text">
                  {item.title}
                </h2>
                {(phase || item.errand) && (
                  <p className="mt-2 flex flex-wrap gap-2">
                    {phase && <PhaseBadge phase={phase} text={text} />}
                    {item.errand && <ErrandBadge kind={item.errand} text={text} />}
                  </p>
                )}
                {item.detail && <p className="mt-2 text-body text-pretty text-text-muted">{item.detail}</p>}
                {/* The backups are further down this sheet, where each can be put in place; this only says they
                    are there and takes the reader to them. */}
                {!item.standIn && standingBy > 0 && (
                  <button
                    type="button"
                    onClick={() => document.getElementById(BACKUPS_ID)?.scrollIntoView({ block: "start" })}
                    className={`${TEXT_LINK} mt-2 tabular-nums`}
                  >
                    <LifeBuoy className="size-4 shrink-0" aria-hidden="true" />
                    {plural(text.backups.ready, standingBy, locale)}
                    <ArrowDown
                      className="size-4 shrink-0 transition-[translate] duration-200 ease-out group-hover:translate-y-1"
                      aria-hidden="true"
                    />
                  </button>
                )}
                {item.standIn && (
                  <p
                    role="status"
                    className="mt-4 flex items-start gap-3 rounded-lg bg-primary-subtle px-4 py-3 text-body-sm text-pretty text-on-primary-subtle"
                  >
                    <Repeat2 className="size-5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-label">
                        {text.backups.inUse} · {text.backups.kinds[item.standIn]}
                      </span>
                      {text.backups.inUseNote}
                    </span>
                  </p>
                )}
              </div>

              <dl className="grid gap-4 empty:hidden sm:grid-cols-2">
                {item.address && (
                  <div className="flex items-start gap-3 sm:col-span-2">
                    <MapPin className="size-5 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className={FACT_LABEL}>{text.address}</dt>
                      <dd className="text-body-sm text-pretty text-text">{item.address}</dd>
                    </div>
                  </div>
                )}
                {item.openingHours && (
                  <div className="flex items-start gap-3">
                    <Clock className="size-5 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className={FACT_LABEL}>{text.openingHours}</dt>
                      <dd className="text-body-sm text-text">{item.openingHours}</dd>
                    </div>
                  </div>
                )}
                {item.priceLevel && (
                  <div className="flex items-start gap-3">
                    <Wallet className="size-5 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className={FACT_LABEL}>{text.price}</dt>
                      <dd className="text-body-sm text-text">{item.priceLevel}</dd>
                    </div>
                  </div>
                )}
                {item.rating !== undefined && (
                  <div className="flex items-start gap-3">
                    <Star className="size-5 shrink-0 fill-primary text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className={FACT_LABEL}>{text.ratingLabel}</dt>
                      <dd className="text-body-sm text-text tabular-nums">
                        {fillTemplate(text.rating, { rating: item.rating })}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>

              {item.errand !== "wash" && (
                <a
                  href={mapsUrl(item, destination)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${OUTLINE_BUTTON} w-full`}
                >
                  <MapPin className="size-4" aria-hidden="true" />
                  {text.openMap}
                  <ExternalLink className="size-4 text-text-muted" aria-hidden="true" />
                </a>
              )}

              {(item.covers.length > 0 || (item.violations?.length ?? 0) > 0) && (
                <section>
                  <h3 className={SECTION_TITLE}>{text.forGroup}</h3>
                  <div className="mt-2 space-y-3">
                    <StopCovers item={item} label={text.honours} describeCover={describeCover} />
                    <StopViolations item={item} label={text.check} />
                  </div>
                </section>
              )}

              <StopBackups
                item={item}
                destination={destination}
                text={text}
                validated={validated}
                describeCover={describeCover}
                onUse={onUseBackup ? switchBackup : undefined}
              />

              {nextItem && isLegCurrent(item, nextItem) && item.travelToNext && (
                <section>
                  <h3 className={SECTION_TITLE}>{text.afterThis}</h3>
                  <p className="mt-2 flex items-start gap-3 text-body-sm text-pretty text-text tabular-nums">
                    <Car className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
                    {fillTemplate(text.afterThisLeg, {
                      duration: item.travelToNext.duration,
                      distance: item.travelToNext.distance,
                      name: nextItem.title,
                    })}
                  </p>
                </section>
              )}
            </div>
          </div>

          <div className="safe-bottom flex shrink-0 gap-3 border-t border-border px-surface pt-3">
            <button type="button" disabled={index === 0} onClick={() => step(-1)} className={STEP_BUTTON}>
              <ArrowLeft className="size-4 shrink-0 transition-[translate] duration-200 ease-out group-hover:-translate-x-1" aria-hidden="true" />
              {text.previous}
            </button>
            <button
              type="button"
              disabled={index === items.length - 1}
              onClick={() => step(1)}
              className={STEP_BUTTON}
            >
              {text.following}
              <ArrowRight className="size-4 shrink-0 transition-[translate] duration-200 ease-out group-hover:translate-x-1" aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
