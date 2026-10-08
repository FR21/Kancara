"use client";

import { ArrowLeft, ArrowRight, Car, Clock, ExternalLink, MapPin, Star, Wallet, X } from "lucide-react";
import { type KeyboardEvent, type MouseEvent, useEffect, useRef } from "react";
import type { ItineraryItem } from "@/lib/api/captain";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import {
  type StopPhase,
  formatDuration,
  PhaseBadge,
  splitTime,
  StopCovers,
  StopViolations,
} from "./ItineraryStop";
import { OUTLINE_BUTTON } from "./styles";

type StopDialogProps = {
  items: ItineraryItem[];
  /** The stop being shown, or null while the sheet is closed. */
  index: number | null;
  phases: (StopPhase | null)[];
  dayLabel: string;
  destination: string;
  text: Messages["plan"]["itinerary"];
  describeCover: (cover: ItineraryItem["covers"][number]) => string;
  onNavigate: (index: number) => void;
  onClose: () => void;
};

const ICON_BUTTON =
  "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-text transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.97]";
const STEP_BUTTON =
  "inline-flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-border-strong px-4 text-label-lg text-text transition-[background-color,scale,opacity] duration-150 ease-out hover:bg-surface-muted active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40";
const FACT_LABEL = "text-caption font-bold text-text-muted";
const SECTION_TITLE = "font-sans text-label text-text";

function mapsUrl(item: ItineraryItem, destination: string): string {
  const query = [item.title, item.address || destination].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// A stop's details: a sheet rising from the bottom edge on a phone, a centred
// dialog from 640px. It steps through the day's stops without closing.
export default function StopDialog({
  items,
  index,
  phases,
  dayLabel,
  destination,
  text,
  describeCover,
  onNavigate,
  onClose,
}: StopDialogProps) {
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
    scrollRef.current?.scrollTo({ top: 0 });
  }, [index]);

  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const step = (offset: number) => {
    if (index === null) return;
    const target = index + offset;
    if (target >= 0 && target < items.length) onNavigate(target);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "ArrowRight") step(1);
    if (event.key === "ArrowLeft") step(-1);
  };

  const time = item ? splitTime(item.time) : { start: "", end: "" };
  const duration = item ? formatDuration(item.time, text) : "";
  const phase = index === null ? null : (phases[index] ?? null);
  const nextItem = index === null ? undefined : items[index + 1];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="stop-dialog-title"
      onClose={onClose}
      onClick={closeOnBackdrop}
      onKeyDown={handleKeyDown}
      className="mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-background p-0 text-text backdrop:bg-neutral-950/70 open:flex open:motion-safe:animate-sheet-up sm:m-auto sm:max-h-[86dvh] sm:max-w-xl sm:rounded-3xl sm:open:motion-safe:animate-message-in"
    >
      {item && index !== null && (
        <>
          <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-strong sm:hidden" />
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border py-1 pr-2 pl-5 sm:py-2">
            <p className="min-w-0 truncate text-label text-text-muted tabular-nums">
              {dayLabel} · {fillTemplate(text.position, { current: index + 1, total: items.length })}
            </p>
            <button type="button" aria-label={text.close} title={text.close} onClick={onClose} className={ICON_BUTTON}>
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]">
            {item.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- place photos come from a remote API with per-request URLs
              <img src={item.imageUrl} alt="" className="aspect-2/1 w-full bg-surface-muted object-cover sm:aspect-5/2" />
            )}

            <div key={index} className="space-y-6 px-5 py-5 motion-safe:animate-message-in">
              <div>
                <p className="text-label text-primary tabular-nums">
                  {time.start}
                  {time.end && ` – ${time.end}`}
                  {duration && <span className="text-text-muted"> · {duration}</span>}
                </p>
                <h2 id="stop-dialog-title" className="mt-1 text-h3 text-pretty text-text">
                  {item.title}
                </h2>
                {phase && (
                  <p className="mt-3">
                    <PhaseBadge phase={phase} text={text} />
                  </p>
                )}
                {item.detail && <p className="mt-3 text-body text-pretty text-text-muted">{item.detail}</p>}
              </div>

              <dl className="grid gap-4 empty:hidden sm:grid-cols-2">
                {item.address && (
                  <div className="flex items-start gap-3 sm:col-span-2">
                    <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className={FACT_LABEL}>{text.address}</dt>
                      <dd className="text-body-sm text-pretty text-text">{item.address}</dd>
                    </div>
                  </div>
                )}
                {item.openingHours && (
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className={FACT_LABEL}>{text.openingHours}</dt>
                      <dd className="text-body-sm text-text">{item.openingHours}</dd>
                    </div>
                  </div>
                )}
                {item.priceLevel && (
                  <div className="flex items-start gap-3">
                    <Wallet className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className={FACT_LABEL}>{text.price}</dt>
                      <dd className="text-body-sm text-text">{item.priceLevel}</dd>
                    </div>
                  </div>
                )}
                {item.rating !== undefined && (
                  <div className="flex items-start gap-3">
                    <Star className="mt-0.5 size-5 shrink-0 fill-primary text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className={FACT_LABEL}>{text.ratingLabel}</dt>
                      <dd className="text-body-sm text-text tabular-nums">
                        {fillTemplate(text.rating, { rating: item.rating })}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>

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

              {(item.covers.length > 0 || (item.violations?.length ?? 0) > 0) && (
                <section>
                  <h3 className={SECTION_TITLE}>{text.forGroup}</h3>
                  <div className="mt-2 space-y-3">
                    <StopCovers item={item} label={text.honours} describeCover={describeCover} />
                    <StopViolations item={item} label={text.check} />
                  </div>
                </section>
              )}

              {nextItem && item.travelToNext && (
                <section>
                  <h3 className={SECTION_TITLE}>{text.afterThis}</h3>
                  <p className="mt-2 flex items-start gap-3 text-body-sm text-pretty text-text tabular-nums">
                    <Car className="mt-0.5 size-5 shrink-0 text-text-muted" aria-hidden="true" />
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

          <div className="safe-bottom flex shrink-0 gap-3 border-t border-border px-5 pt-3">
            <button type="button" disabled={index === 0} onClick={() => step(-1)} className={STEP_BUTTON}>
              <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
              {text.previous}
            </button>
            <button
              type="button"
              disabled={index === items.length - 1}
              onClick={() => step(1)}
              className={STEP_BUTTON}
            >
              {text.following}
              <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
