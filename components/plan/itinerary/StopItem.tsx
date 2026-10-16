"use client";

import {
  Bed,
  Bus,
  Check,
  Coffee,
  Landmark,
  type LucideIcon,
  MapPin,
  Repeat2,
  ShoppingBag,
  Star,
  TreePine,
  TriangleAlert,
  Utensils,
  WashingMachine,
  Church,
  Ticket,
} from "lucide-react";
import { useState } from "react";
import IconButton from "@/components/ui/IconButton";
import { BADGE } from "@/components/ui/styles";
import type { ItineraryItem } from "@/lib/client/captain";
import type { Messages } from "@/lib/messages";
import type { PlaceCategory } from "@/lib/place-category";
import { fillTemplate } from "@/lib/plan-draft";
import { splitTime } from "@/lib/stop-time";
import { listBackups } from "@/lib/backups";
import { ErrandBadge, PhaseBadge, type StopPhase, formatDuration } from "../StopBadges";

export const CATEGORY_ICONS: Record<PlaceCategory, LucideIcon> = {
  meal: Utensils,
  cafe: Coffee,
  attraction: Ticket,
  museum: Landmark,
  nature: TreePine,
  shopping: ShoppingBag,
  worship: Church,
  lodging: Bed,
  transport: Bus,
  other: MapPin,
};

type StopItemProps = {
  item: ItineraryItem;
  number: number;
  phase: StopPhase | null;
  /** Highlighted because the visitor points at it, here or at its pin on the map. */
  active: boolean;
  text: Messages["plan"]["itinerary"];
  needLabels: Messages["plan"]["needs"];
  onOpen: () => void;
  onBackups: () => void;
  onPoint: (pointing: boolean) => void;
};

// One stop on the day's line: its number on the line (the same number as its pin on the map), the time and how long
// it lasts beside it, then the place. The place leads with its photo, wide across the card, because seeing it is
// what tells the group where they are going; a place without one (or whose photo fails) gets its category's icon
// beside the name instead of an empty frame. Under the name: what kind of place it is, what it costs, and how it
// meets the group's needs. The whole card opens the stop's details; its one other control opens the backups.
export default function StopItem({ item, number, phase, active, text, needLabels, onOpen, onBackups, onPoint }: StopItemProps) {
  const { start } = splitTime(item.time);
  const duration = formatDuration(item.time, text);
  const kind = item.errand ? text.errands[item.errand] : text.timeline.categories[item.category ?? "other"];
  const facts = [kind, item.priceLevel].filter(Boolean).join(" · ");
  const partly = new Set((item.violations ?? []).map((violation) => violation.need));
  const met = item.covers.filter((cover) => !partly.has(cover.need));
  const backups = listBackups(item).filter((backup) => backup.kind !== "main").length;
  const done = phase === "done";
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(item.imageUrl) && !photoFailed;
  const Icon = item.errand ? WashingMachine : CATEGORY_ICONS[item.category ?? "other"];

  return (
    <li
      className="grid grid-cols-[3.5rem_2rem_minmax(0,1fr)] gap-x-3"
      onMouseEnter={() => onPoint(true)}
      onMouseLeave={() => onPoint(false)}
      onFocus={() => onPoint(true)}
      onBlur={() => onPoint(false)}
    >
      <div className="pt-4 text-right">
        <p className={`text-label tabular-nums ${done ? "text-text-muted" : "text-text"}`}>{start}</p>
        {duration && <p className="mt-1 text-caption text-text-muted tabular-nums">{duration}</p>}
      </div>

      <div className="relative z-10 flex justify-center pt-4">
        <span
          aria-hidden="true"
          className={`flex size-8 items-center justify-center rounded-full text-caption font-bold tabular-nums ring-4 ring-background transition-[background-color,color,scale] duration-200 ease-out ${
            active || phase === "now" ? "scale-110 bg-primary text-on-primary" : "bg-primary-subtle text-on-primary-subtle"
          }`}
        >
          {number}
        </span>
      </div>

      <div
        className={`group/stop relative rounded-media-frame p-surface transition-[background-color] duration-150 ease-out [--surface-pad:1rem] ${
          phase === "now" ? "bg-primary-subtle" : ""
        } ${active && phase !== "now" ? "bg-surface-muted" : ""} hover:bg-surface-muted`}
      >
        <div className="sm:flex sm:items-start sm:gap-4">
          {showPhoto && (
            // eslint-disable-next-line @next/next/no-img-element -- place photos are served per request by /api/place-photo
            <img
              src={item.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setPhotoFailed(true)}
              className={`h-36 w-full rounded-media bg-surface-muted object-cover transition-[opacity] duration-200 ease-out sm:aspect-4/3 sm:h-auto sm:w-40 sm:shrink-0 ${done ? "opacity-60" : ""}`}
            />
          )}
          <div className={`flex min-w-0 flex-1 items-start gap-3 ${showPhoto ? "mt-4 sm:mt-0" : ""}`}>
            {!showPhoto && (
              <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-media bg-primary-subtle text-primary">
                <Icon className="size-6" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-label-lg text-pretty">
                {/* The button's ::after covers the row, so the whole row opens the stop. */}
                <button
                  type="button"
                  onClick={onOpen}
                  className={`cursor-pointer text-left font-semibold after:absolute after:inset-0 after:rounded-media-frame focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-primary ${
                    done ? "text-text-muted" : "text-text"
                  }`}
                >
                  {item.title}
                </button>
              </h4>
              {facts && <p className="mt-1 text-body-sm text-pretty text-text-muted">{facts}</p>}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {phase !== null && <PhaseBadge phase={phase} text={text} />}
                {item.errand && <ErrandBadge kind={item.errand} text={text} />}
                {item.standIn && (
                  <span className={`${BADGE} border border-primary text-primary`}>
                    <Repeat2 className="size-3 shrink-0" aria-hidden="true" />
                    {text.backups.inUse}
                  </span>
                )}
                {met.map((cover) => (
                  <span key={cover.need} className={`${BADGE} bg-success-subtle text-on-success-subtle`}>
                    <Check className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
                    {needLabels[cover.need]}
                    <span className="sr-only">, {text.timeline.needMet}</span>
                  </span>
                ))}
                {[...partly].map((need) => (
                  <span key={need} className={`${BADGE} bg-warning-subtle text-on-warning-subtle`}>
                    <TriangleAlert className="size-3 shrink-0" aria-hidden="true" />
                    {fillTemplate(text.timeline.needPartly, { need: needLabels[need] })}
                  </span>
                ))}
                {item.rating !== undefined && (
                  <span className="inline-flex items-center gap-1 text-caption font-bold text-text tabular-nums">
                    <Star className="size-3 fill-accent text-accent-500" aria-hidden="true" />
                    <span aria-hidden="true">{item.rating.toFixed(1)}</span>
                    <span className="sr-only">{fillTemplate(text.rating, { rating: item.rating })}</span>
                  </span>
                )}
              </div>
            </div>

            {backups > 0 && (
              <IconButton
                label={fillTemplate(text.timeline.backupsFor, { name: item.title })}
                onClick={onBackups}
                tone="primaryQuiet"
                className="relative z-10 -mt-2 -mr-2"
              >
                <Repeat2 className="size-5" aria-hidden="true" />
              </IconButton>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
