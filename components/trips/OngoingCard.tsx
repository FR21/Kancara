"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { formatDays, formatTripDates, plural } from "@/lib/trips/format";
import { type TripCard as TripCardData, tripHref } from "@/lib/trips/trip";
import { useLocale } from "@/lib/use-locale";
import MemberStack from "./MemberStack";
import { OfflineBadge, ViolationsBadge } from "./TripBadges";
import { CARD_LINK } from "./TripCard";
import TripMenu, { type TripActions } from "./TripMenu";
import TripRoute from "./TripRoute";

type OngoingCardProps = {
  card: TripCardData;
  text: Messages["trips"];
  actions: TripActions;
};

const LABEL = "text-caption font-bold tracking-wider text-text-muted uppercase";
const NOTCH = "absolute -top-3 size-6 rounded-full border border-border bg-background dark:border-primary/25";

// The trip in progress is shown as a full boarding pass: band, route,
// perforation, and a stub that holds the way into today's schedule.
export default function OngoingCard({ card, text, actions }: OngoingCardProps) {
  const locale = useLocale();
  const title = card.name || text.card.untitled;
  const day = card.day ?? 1;
  const hasBadges = card.violations !== undefined || card.offline !== undefined;

  return (
    <article
      id={`trip-${card.id}`}
      className="relative has-[[aria-expanded=true]]:z-20 motion-safe:animate-ticket-in"
    >
      <div className="group relative overflow-clip rounded-3xl bg-surface shadow-xl ring-1 shadow-neutral-950/10 ring-border ring-inset dark:ring-primary/25">
        <div className="flex h-12 items-center gap-3 bg-primary pr-14 pl-5 text-on-primary sm:pl-6">
          <span aria-hidden="true" className="relative flex size-2 shrink-0">
            <span className="absolute -inset-1 rounded-full bg-accent/50 motion-safe:animate-signal" />
            <span className="size-2 rounded-full bg-accent" />
          </span>
          <p className="truncate text-label-lg">{text.status.ongoing}</p>
        </div>

        <div className="px-5 pt-5 pb-6 sm:px-6">
          <h3 className="font-sans text-label-lg text-pretty text-text">{title}</h3>
          <div className="mt-2">
            <TripRoute
              origin={card.origin}
              destinations={card.destinations}
              toLabel={text.card.routeTo}
              emptyLabel={text.card.noRoute}
              large
            />
          </div>
          <p className="mt-2 text-body text-text-muted tabular-nums">
            {formatTripDates(card.startDate, card.endDate, locale)} · {formatDays(card.days, locale)}
          </p>

          <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4">
            <div className="min-w-0 flex-1 basis-56">
              <p className="text-label text-text tabular-nums">
                {fillTemplate(text.card.dayOf, { day, total: card.days })}
              </p>
              <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div style={{ width: `${(day / card.days) * 100}%` }} className="h-full rounded-full bg-primary" />
              </div>
            </div>
            <MemberStack
              members={card.members}
              count={card.memberCount}
              label={plural(text.card.members, card.memberCount, locale)}
              moreLabel={text.card.moreMembers}
            />
          </div>
        </div>

        <div aria-hidden="true" className="relative border-t border-dashed border-border-strong">
          <span className={`${NOTCH} -left-3`} />
          <span className={`${NOTCH} -right-3`} />
        </div>

        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {card.nextActivity && (
              <div>
                <p className={LABEL}>{text.card.next}</p>
                <p className="mt-1 text-label-lg text-pretty text-text">
                  <span className="tabular-nums">{card.nextActivity.time}</span> · {card.nextActivity.title}
                </p>
              </div>
            )}
            {hasBadges && (
              <div className="flex flex-wrap gap-2">
                {card.violations !== undefined && (
                  <ViolationsBadge
                    count={card.violations}
                    label={plural(text.card.violations, card.violations, locale)}
                  />
                )}
                {card.offline !== undefined && (
                  <OfflineBadge state={card.offline} label={text.card.offline[card.offline]} />
                )}
              </div>
            )}
          </div>
          <Link href={tripHref(card)} className={`${CARD_LINK} block shrink-0 after:rounded-3xl`}>
            <span className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-8 text-label-lg text-on-primary shadow-md shadow-primary/20 transition-[background-color,scale] duration-150 ease-out group-hover:bg-primary-hover group-active:scale-[0.97]">
              {text.card.openToday}
              <ArrowRight
                className="size-4 transition-[translate] duration-200 ease-out group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </Link>
        </div>
      </div>

      <TripMenu
        card={card}
        name={title}
        text={text.menu}
        actions={actions}
        onBand
        className="absolute top-0.5 right-2 z-10"
      />
    </article>
  );
}
