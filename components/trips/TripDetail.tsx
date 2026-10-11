"use client";

import { ArrowRight, Check, CircleDashed, CopyPlus, Luggage, Share2, Trash2, Wallet, X } from "lucide-react";
import Link from "next/link";
import type { Messages } from "@/lib/messages";
import { fillTemplate, PASS_FIELDS } from "@/lib/plan-draft";
import { formatDays, formatDaysAhead, formatMoney, formatTripDates, plural } from "@/lib/trips/format";
import { type TripCard, DRAFT_SECTIONS, tripHref } from "@/lib/trips/trip";
import { useLocale } from "@/lib/use-locale";
import { useMessages } from "@/lib/use-messages";
import MemberStack from "./MemberStack";
import { OfflineBadge, StatusPill, ViolationsBadge } from "./TripBadges";
import TripRoute from "./TripRoute";

export type TripActions = {
  onDuplicate: (card: TripCard) => void;
  onShare: (card: TripCard) => void;
  onDelete: (card: TripCard) => void;
};

type TripDetailProps = {
  card: TripCard;
  text: Messages["trips"];
  needLabels: Messages["plan"]["needs"];
  actions: TripActions;
  headingId: string;
  /** Present when the panel is shown as a sheet on a phone. */
  onClose?: () => void;
};

const FIELD_LABEL = "text-caption font-bold text-text-muted";
const FIELD_VALUE = "mt-1 text-label-lg text-text tabular-nums";
const BLOCK_TITLE = "text-label text-text";
const ACTION =
  "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-border-strong px-4 text-label transition-[background-color,border-color,scale] duration-150 ease-out active:scale-[0.97]";
const TRACK = "h-2 overflow-hidden rounded-full bg-surface-muted";
const NEED =
  "max-w-full rounded-2xl border border-border-strong px-2 py-1 text-caption font-bold wrap-anywhere text-text";

// Everything about one trip, and the way into it. On a laptop it sits beside
// the list; on a phone the same panel rises as a sheet.
export default function TripDetail({ card, text, needLabels, actions, headingId, onClose }: TripDetailProps) {
  const locale = useLocale();
  const packingText = useMessages("packing");
  const title = card.name || text.card.untitled;
  const detail = text.detail;
  const hasBadges = card.violations !== undefined || card.offline !== undefined;

  const openLabels = {
    ongoing: text.card.openToday,
    upcoming: detail.openItinerary,
    draft: text.card.continue,
    completed: detail.openSummary,
  };

  const costLabel = () => {
    if (!card.cost) return "";
    const spent = formatMoney(card.cost.spent, locale);
    if (card.cost.budget === null) return fillTemplate(text.card.spent, { spent });
    return fillTemplate(text.card.spentOf, { spent, budget: formatMoney(card.cost.budget, locale) });
  };

  return (
    <article
      aria-labelledby={headingId}
      className={`overflow-clip bg-surface ${onClose ? "rounded-t-3xl" : "rounded-3xl border border-border"}`}
    >
      <header className="bg-primary px-5 pt-5 pb-6 text-on-primary sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <StatusPill status={card.status} label={text.status[card.status]} />
          {onClose && (
            <button
              type="button"
              aria-label={detail.close}
              title={detail.close}
              onClick={onClose}
              className="-mr-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-[background-color,scale] duration-150 ease-out hover:bg-on-primary/15 focus-visible:outline-on-primary active:scale-[0.97]"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>
        <h2 id={headingId} className="mt-4 font-sans text-label-lg text-pretty">
          {title}
        </h2>
        <div className="mt-1">
          <TripRoute
            origin={card.origin}
            destinations={card.destinations}
            toLabel={text.card.routeTo}
            emptyLabel={text.card.noRoute}
          />
        </div>
      </header>

      <div className="space-y-6 px-5 py-6 sm:px-6">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
          <div>
            <dt className={FIELD_LABEL}>{detail.fields.dates}</dt>
            <dd className={FIELD_VALUE}>
              {card.startDate ? formatTripDates(card.startDate, card.endDate, locale) : detail.notSet}
            </dd>
          </div>
          <div>
            <dt className={FIELD_LABEL}>{detail.fields.duration}</dt>
            <dd className={FIELD_VALUE}>{card.days > 0 ? formatDays(card.days, locale) : detail.notSet}</dd>
          </div>
          <div>
            <dt className={FIELD_LABEL}>{detail.fields.budget}</dt>
            <dd className={FIELD_VALUE}>{card.budget === null ? detail.notSet : formatMoney(card.budget, locale)}</dd>
          </div>
          <div>
            <dt className={FIELD_LABEL}>{detail.fields.role}</dt>
            <dd className={FIELD_VALUE}>{detail.roles[card.role]}</dd>
          </div>
        </dl>

        <div>
          <h3 className={`font-sans ${BLOCK_TITLE}`}>{detail.group}</h3>
          <div className="mt-2">
            <MemberStack
              members={card.members}
              count={card.memberCount}
              label={
                card.memberCount > 0 ? plural(text.card.members, card.memberCount, locale) : text.card.noMembers
              }
              moreLabel={text.card.moreMembers}
            />
          </div>
          {card.needs.length + card.customNeeds.length > 0 && (
            <ul aria-label={detail.needs} className="mt-3 flex flex-wrap gap-2">
              {card.needs.map((need) => (
                <li key={need} className={NEED}>
                  {needLabels[need]}
                </li>
              ))}
              {card.customNeeds.map((need) => (
                <li key={need} className={NEED}>
                  {need}
                </li>
              ))}
            </ul>
          )}
        </div>

        {card.status === "ongoing" && (
          <div>
            <p className={`${BLOCK_TITLE} tabular-nums`}>
              {fillTemplate(text.card.dayOf, { day: card.day ?? 1, total: card.days })}
            </p>
            <div aria-hidden="true" className={`mt-2 ${TRACK}`}>
              <div
                style={{ width: `${((card.day ?? 1) / card.days) * 100}%` }}
                className="h-full origin-left rounded-full bg-primary motion-safe:animate-grow-x"
              />
            </div>
            {card.nextActivity && (
              <div className="mt-4 rounded-2xl bg-surface-muted px-4 py-3">
                <p className={FIELD_LABEL}>{text.card.next}</p>
                <p className="mt-1 text-label-lg text-pretty text-text">
                  <span className="tabular-nums">{card.nextActivity.time}</span> · {card.nextActivity.title}
                </p>
              </div>
            )}
          </div>
        )}

        {card.status === "upcoming" && card.startsIn !== undefined && (
          <p className="font-heading text-h3 text-text">
            {fillTemplate(text.card.departs, { when: formatDaysAhead(card.startsIn, locale) })}
          </p>
        )}

        {card.status === "draft" && (
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className={`font-sans ${BLOCK_TITLE}`}>{detail.sectionsTitle}</h3>
              <p className="text-body-sm text-text-muted tabular-nums">
                {fillTemplate(text.card.progress, { done: card.filled ?? 0, total: DRAFT_SECTIONS })}
              </p>
            </div>
            <div aria-hidden="true" className={`mt-2 ${TRACK}`}>
              <div
                style={{ width: `${((card.filled ?? 0) / DRAFT_SECTIONS) * 100}%` }}
                className="h-full origin-left rounded-full bg-primary motion-safe:animate-grow-x"
              />
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {PASS_FIELDS.map((field) => {
                const missing = card.missing?.includes(field) ?? false;
                return (
                  <li
                    key={field}
                    className={`inline-flex items-center gap-2 text-body-sm ${missing ? "text-text-muted" : "text-text"}`}
                  >
                    {missing ? (
                      <CircleDashed className="size-4" aria-hidden="true" />
                    ) : (
                      <Check className="size-4 text-success" strokeWidth={3} aria-hidden="true" />
                    )}
                    {detail.sections[field]}
                    <span className="sr-only">{missing ? detail.sectionMissing : detail.sectionDone}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {card.cost && (
          <p className="flex items-center gap-2 text-body text-text tabular-nums">
            <Wallet className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
            {costLabel()}
          </p>
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

        <div className="flex flex-col gap-4 border-t border-border pt-6">
          <Link
            href={tripHref(card)}
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-label-lg whitespace-nowrap text-on-primary shadow-md shadow-primary/20 transition-[background-color,scale] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97]"
          >
            {openLabels[card.status]}
            <ArrowRight
              className="size-4 transition-[translate] duration-200 ease-out group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>

          <div role="group" aria-label={detail.actions} className="flex flex-wrap gap-2">
            {card.status !== "draft" && (
              <Link
                href={`/trips/${encodeURIComponent(card.id)}/packing`}
                className={`group/action ${ACTION} text-text hover:bg-surface-muted`}
              >
                <Luggage
                  className="size-4 transition-[rotate] duration-300 ease-spring group-hover/action:-rotate-12"
                  aria-hidden="true"
                />
                {packingText.open}
              </Link>
            )}
            <button
              type="button"
              onClick={() => actions.onDuplicate(card)}
              className={`group/action ${ACTION} text-text hover:bg-surface-muted`}
            >
              <CopyPlus
                className="size-4 transition-[scale] duration-300 ease-spring group-hover/action:scale-125"
                aria-hidden="true"
              />
              {text.menu.duplicate}
            </button>
            <button
              type="button"
              onClick={() => actions.onShare(card)}
              className={`group/action ${ACTION} text-text hover:bg-surface-muted`}
            >
              <Share2
                className="size-4 transition-[rotate] duration-300 ease-spring group-hover/action:-rotate-12"
                aria-hidden="true"
              />
              {text.menu.share}
            </button>
            <button
              type="button"
              onClick={() => actions.onDelete(card)}
              className={`group/action ${ACTION} text-error hover:border-error hover:bg-error-subtle`}
            >
              <Trash2
                className="size-4 transition-[rotate] duration-300 ease-spring group-hover/action:rotate-12"
                aria-hidden="true"
              />
              {text.menu.delete}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
