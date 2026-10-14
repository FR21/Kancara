import { ArrowRight, Compass, MapPin } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import EmptyState from "@/components/ui/EmptyState";
import { buttonClass } from "@/components/ui/styles";
import type { Itinerary } from "@/lib/client/captain";
import type { Messages } from "@/lib/messages";
import { fillTemplate, parseLocalDate } from "@/lib/plan-draft";
import { plural } from "@/lib/trips/format";

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

// The route the group took, day by day, read from the saved itinerary.
export default function RouteRecap({ itinerary, tripHref, locale, text }: RouteRecapProps) {
  // Laundry errands are chores, not places the group went to. A day keeps its number when one before it is empty.
  const days = (itinerary?.days ?? [])
    .map((day, index) => ({ number: index + 1, date: day.date, stops: day.items.filter((item) => !item.errand) }))
    .filter((day) => day.stops.length > 0);

  if (days.length === 0) {
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

  // One card for the whole route, a day per block between hairlines, so the days read as one journey rather
  // than a stack of boxes.
  return (
    <ol className="divide-y divide-border rounded-surface border border-border bg-surface p-surface">
      {days.map((day, index) => {
        const date = dayDate(day.date, locale);
        return (
          <li
            key={day.number}
            style={{ "--item-index": index } as CSSProperties}
            className="py-4 first:pt-0 last:pb-0 motion-safe:animate-list-in"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="text-h3 text-text">{fillTemplate(text.route.day, { day: day.number })}</h2>
              <p className="text-body-sm text-text-muted">
                {[date, plural(text.stats.placesCount, day.stops.length, locale)].filter(Boolean).join(" · ")}
              </p>
            </div>
            <ol className="mt-2 space-y-3">
              {day.stops.map((item, itemIndex) => (
                <li key={`${itemIndex}-${item.title}`} className="flex items-start gap-3">
                  <MapPin className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-body text-text">{item.title}</p>
                    {(item.address || item.detail) && (
                      <p className="mt-1 text-body-sm wrap-break-word text-text-muted">{item.address || item.detail}</p>
                    )}
                  </div>
                  {item.time && <span className="shrink-0 text-body-sm text-text-muted tabular-nums">{item.time}</span>}
                </li>
              ))}
            </ol>
          </li>
        );
      })}
    </ol>
  );
}
