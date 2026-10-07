"use client";

import { ArrowRight, Wallet } from "lucide-react";
import Link from "next/link";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { formatDays, formatDaysAhead, formatMoney, formatTripDates, plural } from "@/lib/trips/format";
import { type TripCard as TripCardData, DRAFT_SECTIONS, tripHref } from "@/lib/trips/trip";
import { useLocale } from "@/lib/use-locale";
import MemberStack from "./MemberStack";
import { OfflineBadge, StatusBadge, ViolationsBadge } from "./TripBadges";
import TripMenu, { type TripActions } from "./TripMenu";
import TripRoute from "./TripRoute";

type TripCardProps = {
  card: TripCardData;
  text: Messages["trips"];
  index: number;
  actions: TripActions;
};

const ENTER_STEP_MS = 40;
const MAX_STAGGER = 8;

// The link's ::after covers the whole card, so the card is one tap target while
// the menu button stays a separate control above it. The link itself must not
// be scaled or moved: a transform would shrink ::after back to the link.
export const CARD_LINK =
  "after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary";

export default function TripCard({ card, text, index, actions }: TripCardProps) {
  const locale = useLocale();
  const isDraft = card.status === "draft";
  const title = card.name || text.card.untitled;
  const href = tripHref(card);
  const filled = card.filled ?? 0;
  const dates = card.startDate
    ? `${formatTripDates(card.startDate, card.endDate, locale)} · ${formatDays(card.days, locale)}`
    : text.card.noDates;
  const membersLabel =
    card.memberCount > 0 ? plural(text.card.members, card.memberCount, locale) : text.card.noMembers;
  const hasStub =
    isDraft ||
    card.startsIn !== undefined ||
    card.violations !== undefined ||
    card.offline !== undefined ||
    card.cost !== undefined;

  const costLabel = () => {
    if (!card.cost) return "";
    const spent = formatMoney(card.cost.spent, locale);
    if (card.cost.budget === null) return fillTemplate(text.card.spent, { spent });
    return fillTemplate(text.card.spentOf, { spent, budget: formatMoney(card.cost.budget, locale) });
  };

  return (
    <article
      id={`trip-${card.id}`}
      style={{ animationDelay: `${Math.min(index, MAX_STAGGER) * ENTER_STEP_MS}ms` }}
      className={`group relative flex flex-col rounded-2xl border bg-surface transition-[border-color] duration-150 ease-out hover:border-primary has-[[aria-expanded=true]]:z-20 motion-safe:animate-message-in ${
        isDraft ? "border-dashed border-border-strong" : "border-border"
      }`}
    >
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex min-h-6 items-center pr-10">
          {card.status !== "ongoing" && <StatusBadge status={card.status} label={text.status[card.status]} />}
        </div>
        <h3 className="font-sans text-label-lg text-pretty text-text">
          {isDraft ? (
            title
          ) : (
            <Link href={href} className={`${CARD_LINK} after:rounded-2xl`}>
              {title}
            </Link>
          )}
        </h3>
        <TripRoute
          origin={card.origin}
          destinations={card.destinations}
          toLabel={text.card.routeTo}
          emptyLabel={text.card.noRoute}
        />
        <p className="text-body-sm text-text-muted tabular-nums">{dates}</p>
        <div className="mt-auto pt-1">
          <MemberStack
            members={card.members}
            count={card.memberCount}
            label={membersLabel}
            moreLabel={text.card.moreMembers}
          />
        </div>
      </div>

      {hasStub && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-dashed border-border-strong px-5 py-4">
          {isDraft && (
            <>
              <div className="min-w-0 flex-1 basis-32">
                <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    style={{ width: `${(filled / DRAFT_SECTIONS) * 100}%` }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
                <p className="mt-2 text-caption text-text-muted tabular-nums">
                  {fillTemplate(text.card.progress, { done: filled, total: DRAFT_SECTIONS })}
                </p>
              </div>
              <Link
                href={href}
                aria-label={fillTemplate(text.card.continueLabel, { name: title })}
                className={`${CARD_LINK} shrink-0 after:rounded-2xl`}
              >
                <span className="inline-flex h-11 items-center gap-2 rounded-full border border-border-strong px-4 text-label text-text transition-[background-color,border-color,color,scale] duration-150 ease-out group-hover:border-primary group-hover:bg-primary group-hover:text-on-primary group-active:scale-[0.97]">
                  {text.card.continue}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </Link>
            </>
          )}
          {card.startsIn !== undefined && (
            <p className="w-full text-label text-text">
              {fillTemplate(text.card.departs, { when: formatDaysAhead(card.startsIn, locale) })}
            </p>
          )}
          {card.violations !== undefined && (
            <ViolationsBadge
              count={card.violations}
              label={plural(text.card.violations, card.violations, locale)}
            />
          )}
          {card.offline !== undefined && (
            <OfflineBadge state={card.offline} label={text.card.offline[card.offline]} />
          )}
          {card.cost && (
            <p className="flex w-full items-center gap-2 text-body-sm text-text tabular-nums">
              <Wallet className="size-4 text-text-muted" aria-hidden="true" />
              {costLabel()}
            </p>
          )}
        </div>
      )}

      <TripMenu card={card} name={title} text={text.menu} actions={actions} className="absolute top-2 right-2 z-10" />
    </article>
  );
}
