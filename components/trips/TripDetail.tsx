"use client";

import { ArrowRight, Check, CircleDashed, CopyPlus, Share2, Trash2, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import FieldPassSheet from "@/components/field-pass/FieldPassSheet";
import ActionMenu, { type ActionMenuItem } from "@/components/ui/ActionMenu";
import IconButton from "@/components/ui/IconButton";
import { NEED_CHIP } from "@/components/ui/NeedChips";
import { PRIMARY_BUTTON, buttonClass } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import { fillTemplate, PASS_FIELDS } from "@/lib/plan-draft";
import { formatDays, formatDaysAhead, formatMoney, formatTripDates, formatTripTitle, plural } from "@/lib/trips/format";
import { type TripCard, DRAFT_SECTIONS, tripHref } from "@/lib/trips/trip";
import { useLocale } from "@/lib/use-locale";
import MemberStack from "./MemberStack";
import { OfflineBadge, StatusPill, ViolationsBadge } from "./TripBadges";
import TripTools from "./TripTools";
import Disclosure from "@/components/ui/Disclosure";
import { useTripKeptOffline } from "@/lib/use-trip-kept-offline";
import type { OfflineState } from "@/lib/trips/trip";

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
const TRACK = "h-2 overflow-hidden rounded-full bg-surface-muted";
const NEED = `${NEED_CHIP} wrap-anywhere`;

// One trip, read top to bottom in three groups: what it is (status, name, route), the facts and the people, and
// what to do now (one main action, then the trip's tools). Secondary actions live in the "⋯" menu. On a laptop
// the card sits beside the list; on a phone the same card rises as a sheet.
export default function TripDetail({ card, text, needLabels, actions, headingId, onClose }: TripDetailProps) {
  const locale = useLocale();
  const [showFieldPass, setShowFieldPass] = useState(false);
  const title = formatTripTitle(card.name, card.destinations, locale, text.card.untitled);
  const detail = text.detail;
  const route = [card.origin, card.destinations.join(", ")].filter(Boolean).join(" → ");
  const onTheWay = card.status === "ongoing" || card.status === "upcoming";
  // Whether this trip opens without signal is read on the device (its pages are in the offline cache), not from the
  // server, which cannot know. Null while the cache is being read.
  const kept = useTripKeptOffline(card.id);
  let offlineState: OfflineState | undefined;
  if (kept !== null) offlineState = kept ? "downloaded" : "notDownloaded";
  const hasBadges = card.violations !== undefined || offlineState !== undefined;
  const hasNeeds = card.needs.length + card.customNeeds.length > 0;

  const openLabels = {
    ongoing: text.card.openToday,
    upcoming: detail.openItinerary,
    draft: text.card.continue,
    completed: detail.openSummary,
  };

  const menuItems: ActionMenuItem[] = [
    ...(card.status === "completed"
      ? []
      : [{ key: "duplicate", label: text.menu.duplicate, icon: CopyPlus, onSelect: () => actions.onDuplicate(card) }]),
    { key: "share", label: text.menu.share, icon: Share2, onSelect: () => actions.onShare(card) },
    { key: "delete", label: text.menu.delete, icon: Trash2, onSelect: () => actions.onDelete(card), danger: true },
  ];

  const costLabel = () => {
    if (!card.cost) return "";
    const spent = formatMoney(card.cost.spent, locale);
    if (card.cost.budget === null) return fillTemplate(text.card.spent, { spent });
    return fillTemplate(text.card.spentOf, { spent, budget: formatMoney(card.cost.budget, locale) });
  };

  return (
    <article
      aria-labelledby={headingId}
      className={`bg-surface p-surface [--surface-pad:1.5rem] ${onClose ? "rounded-t-surface" : "rounded-surface border border-border"}`}
    >
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <StatusPill status={card.status} label={text.status[card.status]} />
          <h2 id={headingId} className="mt-3 text-h3 text-pretty text-text">
            {title}
          </h2>
          <p className="mt-1 text-body-sm text-pretty text-text-muted">{route || text.card.noRoute}</p>
        </div>
        <div className="-mt-2 -mr-2 flex shrink-0 items-center">
          <ActionMenu label={fillTemplate(detail.more, { name: title })} items={menuItems} />
          {onClose && (
            <IconButton label={detail.close} onClick={onClose}>
              <X className="size-5" aria-hidden="true" />
            </IconButton>
          )}
        </div>
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4">
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

      <section aria-labelledby={`${headingId}-group`} className="mt-6">
        <h3 id={`${headingId}-group`} className={BLOCK_TITLE}>
          {detail.group}
        </h3>
        <div className="mt-2">
          <MemberStack
            members={card.members}
            count={card.memberCount}
            label={card.memberCount > 0 ? plural(text.card.members, card.memberCount, locale) : text.card.noMembers}
            moreLabel={text.card.moreMembers}
          />
        </div>
        {/* The needs being looked after are folded under one link, so the card leads with what to do now. */}
        {hasNeeds && (
          <div className="mt-2">
            <Disclosure showLabel={detail.showMore} hideLabel={detail.showLess}>
              <ul aria-label={detail.needs} className="flex flex-wrap gap-2">
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
            </Disclosure>
          </div>
        )}
      </section>

      {card.status === "ongoing" && (
        <section className="mt-6">
          <p className={`${BLOCK_TITLE} tabular-nums`}>{fillTemplate(text.card.dayOf, { day: card.day ?? 1, total: card.days })}</p>
          <div aria-hidden="true" className={`mt-2 ${TRACK}`}>
            <div
              style={{ scale: `${(card.day ?? 1) / card.days} 1` }}
              className="h-full origin-left rounded-full bg-primary motion-safe:animate-grow-x"
            />
          </div>
          {card.nextActivity && (
            <p className="mt-3 text-body-sm text-pretty text-text-muted">
              <span className="text-label text-text">{text.card.next}</span>{" "}
              <span className="tabular-nums">{card.nextActivity.time}</span> · {card.nextActivity.title}
            </p>
          )}
        </section>
      )}

      {card.status === "upcoming" && card.startsIn !== undefined && (
        <p className="mt-6 text-label-lg text-text">{fillTemplate(text.card.departs, { when: formatDaysAhead(card.startsIn, locale) })}</p>
      )}

      {card.status === "draft" && (
        <section className="mt-6">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className={BLOCK_TITLE}>{detail.sectionsTitle}</h3>
            <p className="text-body-sm text-text-muted tabular-nums">
              {fillTemplate(text.card.progress, { done: card.filled ?? 0, total: DRAFT_SECTIONS })}
            </p>
          </div>
          <div aria-hidden="true" className={`mt-2 ${TRACK}`}>
            <div
              style={{ scale: `${(card.filled ?? 0) / DRAFT_SECTIONS} 1` }}
              className="h-full origin-left rounded-full bg-primary motion-safe:animate-grow-x"
            />
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {PASS_FIELDS.map((field) => {
              const missing = card.missing?.includes(field) ?? false;
              return (
                <li key={field} className={`inline-flex items-center gap-2 text-body-sm ${missing ? "text-text-muted" : "text-text"}`}>
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
        </section>
      )}

      {(card.cost || hasBadges) && (
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          {card.cost && (
            <p className="flex items-center gap-2 text-body-sm text-text tabular-nums">
              <Wallet className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
              {costLabel()}
            </p>
          )}
          {card.violations !== undefined && (
            <ViolationsBadge count={card.violations} label={plural(text.card.violations, card.violations, locale)} />
          )}
          {offlineState !== undefined && <OfflineBadge state={offlineState} label={text.card.offline[offlineState]} />}
        </div>
      )}

      {/* As a sheet on a phone, the trip's tools come first and the one main action is pinned to the bottom of the
          sheet, in thumb reach however far the card scrolls. Beside the list on a laptop, the action leads. */}
      {onClose ? (
        <>
          {onTheWay && (
            <div className="mt-6 border-t border-border pt-4">
              <TripTools tripId={card.id} text={text.tools} onOpenFieldPass={() => setShowFieldPass(true)} />
            </div>
          )}
          {/* A full-width 56px button with room under it: the bottom edge of a phone is where a thumb is least sure. */}
          <div className="sticky bottom-0 z-10 -mx-surface -mb-surface mt-6 border-t border-border bg-surface px-surface pt-4 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.75rem))]">
            <Link href={tripHref(card)} className={`group ${buttonClass("primary", "large")} w-full`}>
              {openLabels[card.status]}
              <ArrowRight className="size-4 transition-[translate] duration-200 ease-out group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </>
      ) : (
        <div className="mt-6 border-t border-border pt-4">
          <Link href={tripHref(card)} className={`group ${PRIMARY_BUTTON} w-full`}>
            {openLabels[card.status]}
            <ArrowRight className="size-4 transition-[translate] duration-200 ease-out group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          {onTheWay && (
            <div className="mt-4">
              <TripTools tripId={card.id} text={text.tools} onOpenFieldPass={() => setShowFieldPass(true)} />
            </div>
          )}
        </div>
      )}

      {onTheWay && (
        <FieldPassSheet
          isOpen={showFieldPass}
          onClose={() => setShowFieldPass(false)}
          tripId={card.id}
          destination={card.destinations[0] ?? ""}
        />
      )}
    </article>
  );
}
