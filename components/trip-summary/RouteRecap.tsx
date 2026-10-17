"use client";

import { ArrowRight, Compass, MapPin, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import DayPicker from "@/components/plan/itinerary/DayPicker";
import EmptyState from "@/components/ui/EmptyState";
import { buttonClass } from "@/components/ui/styles";
import { CATEGORY_ICONS } from "@/components/plan/itinerary/StopItem";
import type { Itinerary, ItineraryItem } from "@/lib/client/captain";
import type { Messages } from "@/lib/messages";
import { placePhotoQueryUrl, resolveEffectiveCategory } from "@/lib/place-category";
import { fillTemplate, parseLocalDate } from "@/lib/plan-draft";
import { plural } from "@/lib/trips/format";
import { useWibNow } from "@/lib/use-jakarta-clock";
import { useMessages } from "@/lib/use-messages";

type RouteRecapProps = {
  itinerary: Itinerary | null;
  tripHref: string;
  locale: string;
  text: Messages["tripSummary"];
};

function dayDate(date: string, locale: string): string {
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(parseLocalDate(date));
}

function StopCard({ item }: { item: ItineraryItem }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const effectiveImageUrl = item.imageUrl || (item.title ? placePhotoQueryUrl(item.title) : undefined);
  const category = resolveEffectiveCategory(item.category, item.title);
  const Icon = CATEGORY_ICONS[category] || MapPin;
  const showPhoto = Boolean(effectiveImageUrl) && !photoFailed;

  return (
    <li className="flex items-center gap-3.5 rounded-media p-2 transition-[background-color] duration-150 ease-out hover:bg-surface-muted/60">
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={effectiveImageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setPhotoFailed(true)}
          className="size-16 sm:size-20 shrink-0 rounded-media bg-surface-muted object-cover shadow-xs"
        />
      ) : (
        <span aria-hidden="true" className="flex size-16 sm:size-20 shrink-0 items-center justify-center rounded-media bg-primary-subtle text-primary">
          <Icon className="size-6" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <h3 className="text-label-lg font-semibold text-text text-pretty leading-snug">
          {item.title}
        </h3>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption text-text-muted">
          {item.time && (
            <span className="tabular-nums font-medium text-text-subtle">
              {item.time}
            </span>
          )}
          {item.time && item.rating !== undefined && (
            <span aria-hidden="true">·</span>
          )}
          {item.rating !== undefined && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Star className="size-3 fill-accent text-accent-500" aria-hidden="true" />
              {item.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

// The route the group took, switched day by day using DayPicker just like the main trip itinerary.
export default function RouteRecap({ itinerary, tripHref, locale, text }: RouteRecapProps) {
  const planText = useMessages("plan");
  const clock = useWibNow(true);
  const days = itinerary?.days ?? [];
  const totalStops = days.reduce((sum, day) => sum + day.items.filter((item) => !item.errand).length, 0);

  const [selected, setSelected] = useState(() => {
    const firstWithStops = days.findIndex((day) => day.items.some((item) => !item.errand));
    return firstWithStops !== -1 ? firstWithStops : 0;
  });

  if (days.length === 0 || totalStops === 0) {
    return (
      <EmptyState
        icon={Compass}
        title={text.route.emptyTitle}
        body={text.route.empty}
        headingLevel={2}
        action={
          <Link href={tripHref} className={`group ${buttonClass("primary")}`}>
            {text.route.open}
            <ArrowRight className="size-4 transition-[translate] duration-150 ease-out group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        }
      />
    );
  }

  const currentDay = days[selected] ?? days[0];
  const currentStops = currentDay ? currentDay.items.filter((item) => !item.errand) : [];
  const date = currentDay ? dayDate(currentDay.date, locale) : "";

  return (
    <div className="surface-compact rounded-surface border border-border bg-surface p-surface">
      <header className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-border pb-4">
        <div>
          <h2 className="text-h3 font-semibold text-text">{fillTemplate(text.route.day, { day: selected + 1 })}</h2>
          <p className="mt-1 text-body-sm text-text-muted">
            {[date, plural(text.stats.placesCount, currentStops.length, locale)].filter(Boolean).join(" · ")}
          </p>
        </div>
        {days.length > 1 && (
          <DayPicker
            days={days}
            selected={selected}
            today={clock?.date ?? null}
            locale={locale}
            text={planText.itinerary.picker}
            className="w-full sm:w-auto"
            onSelect={setSelected}
          />
        )}
      </header>

      {currentStops.length > 0 ? (
        <ol key={currentDay.date} className="mt-4 space-y-1 motion-safe:animate-message-in">
          {currentStops.map((item, itemIndex) => (
            <StopCard key={`${itemIndex}-${item.title}`} item={item} />
          ))}
        </ol>
      ) : (
        <p className="py-8 text-center text-body-sm text-text-muted">
          {text.route.emptyDay}
        </p>
      )}
    </div>
  );
}
