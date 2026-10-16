"use client";

import { Pencil, Plane, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import Stamp from "@/components/ui/Stamp";
import type { Messages } from "@/lib/messages";
import {
  type PlanDraft,
  countFilledDetails,
  fillTemplate,
  getMemberName,
  hasBudget,
  hasDateError,
  hasDates,
  missingFields,
  parseLocalDate,
} from "@/lib/plan-draft";
import type { QuestionKey } from "@/lib/plan-questions";
import { useLocale } from "@/lib/use-locale";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { NeedSummary } from "@/components/ui/NeedChips";
import { TEXT_LINK } from "@/components/ui/styles";

type TicketCardProps = {
  draft: PlanDraft;
  text: Messages["plan"];
  arriving?: boolean;
  /** Lifts the pass off the page with a shadow. Off where it already lies on a sheet. */
  raised?: boolean;
  onEdit?: (question: QuestionKey, memberId?: string) => void;
  onAddMember?: () => void;
  children: ReactNode;
};

type SlotProps = {
  interactive: boolean;
  label?: string;
  className: string;
  onClick: () => void;
  children: ReactNode;
};

const EMPTY_MARK = "—";
const MAX_SHOWN = 8;
const LABEL = "flex items-center gap-2 text-caption font-bold tracking-wider text-text-muted uppercase";
// One half of the pass. The notches are cut out of it, so whatever lies behind the ticket shows through them. A
// notch is as deep as the pass's padding, so its bite ends exactly where the content begins.
const HALF = "ticket-notch overflow-clip bg-surface [--ticket-notch-size:var(--surface-pad)]";
// A printed field. It sits at the pass's 12px padding with an 8px corner, so its hover fill is concentric with
// the pass's 20px corner, and the read-only pass keeps the same box so both line up alike.
const FIELD = "rounded-lg px-2 py-2";
const EDIT_ICON =
  "size-3 shrink-0 text-text-muted transition-[color,scale] duration-150 ease-out group-hover/edit:scale-110 group-hover/edit:text-primary";

function Slot({ interactive, label, className, onClick, children }: SlotProps) {
  if (!interactive) return <div className={className}>{children}</div>;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`group/edit cursor-pointer transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.99] ${className}`}
    >
      {children}
    </button>
  );
}

// The plan as a boarding pass: a compact surface torn in two. It lays itself out by the room it is given, not by
// the screen, so the same pass reads well on the review page and in the preview sheet.
export default function TicketCard({
  draft,
  text,
  arriving = false,
  raised = true,
  onEdit,
  onAddMember,
  children,
}: TicketCardProps) {
  const locale = useLocale();
  const pass = text.pass;
  const ticket = text.ticket;
  const interactive = onEdit !== undefined;
  const edit = (question: QuestionKey, memberId?: string) => onEdit?.(question, memberId);
  const missing = missingFields(draft);
  const ready = missing.length === 0;
  const filledExtras = countFilledDetails(draft);

  const dateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const moneyFormat = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const listFormat = new Intl.ListFormat(locale, { style: "long", type: "conjunction" });

  const origin = draft.origin.trim();
  const destination = draft.destinations.join(" → ");
  const dates =
    hasDates(draft) && !hasDateError(draft)
      ? dateFormat.formatRange(parseLocalDate(draft.startDate), parseLocalDate(draft.endDate))
      : "";
  const group = draft.members.length > 0 ? `${draft.members.length} ${pass.people}` : "";
  const budget = hasBudget(draft) && draft.budget !== null ? moneyFormat.format(draft.budget) : "";
  const pace = draft.pace ? text.paces[draft.pace] : "";
  const fields: { question: QuestionKey; label: string; value: string }[] = [
    { question: "trip", label: pass.dates, value: dates },
    { question: "crew", label: pass.group, value: group },
    { question: "budget", label: pass.budget, value: budget },
    { question: "trip", label: pass.pace, value: pace },
  ];
  const shown = interactive ? draft.members : draft.members.slice(0, MAX_SHOWN);
  const hidden = draft.members.length - shown.length;
  const missingLabels = missing.map((field) => ticket.missing[field]);
  const status = (label: string, value: string) =>
    fillTemplate(pass.fieldStatus, { label, value: value || pass.empty });

  return (
    <div
      className={`surface-compact @container ${raised ? "drop-shadow-xl drop-shadow-neutral-950/15" : ""} ${arriving ? "motion-safe:animate-ticket-in" : ""}`}
    >
      <div className="group/ticket @2xl:grid @2xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div
          className={`@container min-w-0 notch-bottom rounded-t-surface @2xl:notch-right @2xl:rounded-l-surface @2xl:rounded-tr-none ${HALF}`}
        >
          <div className="flex h-10 items-center bg-primary px-surface text-on-primary">
            <p className="flex items-center gap-2 px-2 text-label">
              <Plane className="size-4" aria-hidden="true" />
              {pass.brand}
            </p>
          </div>

          <div className="p-surface">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-1.5 sm:gap-2">
              <Slot
                interactive={interactive}
                label={status(pass.origin, origin)}
                onClick={() => edit("trip")}
                className={`min-w-0 text-left ${FIELD}`}
              >
                <span className={LABEL}>
                  {ticket.from}
                  {interactive && <Pencil aria-hidden="true" className={EDIT_ICON} />}
                </span>
                <span
                  className={`block truncate font-heading text-h3 uppercase sm:text-h2 ${
                    origin ? "font-extrabold text-text" : "text-text-muted"
                  }`}
                >
                  {origin || EMPTY_MARK}
                </span>
              </Slot>
              <div aria-hidden="true" className="flex shrink-0 items-center justify-center gap-1.5 pb-2 text-primary sm:gap-3 sm:px-2 sm:pb-4">
                <span className="h-px w-3 border-t border-dashed border-border-strong sm:w-8" />
                <Plane className="size-4 shrink-0 transition-[translate] duration-500 ease-spring group-hover/ticket:translate-x-1 sm:size-5" />
                <span className="h-px w-3 border-t border-dashed border-border-strong sm:w-8" />
              </div>
              <Slot
                interactive={interactive}
                label={status(pass.destinations, destination)}
                onClick={() => edit("trip")}
                className={`min-w-0 text-right ${FIELD}`}
              >
                <span className={`${LABEL} justify-end`}>
                  {ticket.to}
                  {interactive && <Pencil aria-hidden="true" className={EDIT_ICON} />}
                </span>
                <span
                  className={`block truncate font-heading text-h3 uppercase sm:text-h2 ${
                    destination ? "font-extrabold text-text" : "text-text-muted"
                  }`}
                >
                  {destination || EMPTY_MARK}
                </span>
              </Slot>
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-dashed border-border-strong/40 pt-3 @lg:grid-cols-4">
              {fields.map((field, index) => {
                const isRight = index % 2 === 1;
                return (
                  <Slot
                    key={field.label}
                    interactive={interactive}
                    label={status(field.label, field.value)}
                    onClick={() => edit(field.question)}
                    className={`min-w-0 ${FIELD} ${isRight ? "text-right @lg:text-left" : "text-left"}`}
                  >
                    <span className={`${LABEL} ${isRight ? "justify-end @lg:justify-start" : "justify-start"}`}>
                      {field.label}
                      {interactive && <Pencil aria-hidden="true" className={EDIT_ICON} />}
                    </span>
                    <span
                      className={`mt-1 block truncate rounded-lg font-heading text-h3 ${
                        field.value ? "font-extrabold text-text motion-safe:animate-pass-print" : "text-text-muted"
                      } ${isRight ? "text-right @lg:text-left" : "text-left"}`}
                    >
                      {field.value || EMPTY_MARK}
                    </span>
                  </Slot>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border p-surface">
            <div className="flex min-h-11 items-center justify-between gap-2 pl-2">
              <h2 className={LABEL}>{pass.manifest}</h2>
              {interactive && (
                <button type="button" onClick={onAddMember} className={`${TEXT_LINK} pr-2`}>
                  <UserPlus className="size-4" aria-hidden="true" />
                  {pass.addMember}
                </button>
              )}
            </div>
            {draft.members.length === 0 && <p className="px-2 text-body-sm text-text-muted">{pass.noMembers}</p>}
            {draft.members.length > 0 && (
              <ul className="mt-1 flex flex-wrap gap-2">
                {shown.map((member, index) => (
                  <li key={member.id} className="max-w-full">
                    <Slot
                      interactive={interactive}
                      onClick={() => edit("crew", member.id)}
                      className={`flex max-w-full items-center gap-2 rounded-full border border-border pl-1 text-label text-text ${
                        interactive ? "min-h-11 pr-4" : "py-1 pr-3"
                      }`}
                    >
                      <MemberAvatar ageGroup={member.ageGroup} variant={index} className={interactive ? "size-9" : "size-7"} />
                      <span className="min-w-0 truncate">{getMemberName(member, draft.members, text.ageGroups)}</span>
                      {interactive && <Pencil aria-hidden="true" className={EDIT_ICON} />}
                    </Slot>
                  </li>
                ))}
                {hidden > 0 && (
                  <li className="flex items-center rounded-full border border-dashed border-border-strong px-3 py-1 text-label text-text-muted">
                    {fillTemplate(ticket.more, { count: hidden })}
                  </li>
                )}
              </ul>
            )}
            <NeedSummary members={draft.members} text={text} className="mt-3" />
          </div>
        </div>

        <div
          className={`notch-top rounded-b-surface border-t border-dashed border-border-strong @2xl:flex @2xl:flex-col @2xl:notch-left @2xl:rounded-r-surface @2xl:rounded-bl-none @2xl:border-t-0 ${HALF}`}
        >
          <div aria-hidden="true" className="hidden h-10 bg-primary @2xl:block" />
          <div className="flex flex-col gap-4 p-surface @2xl:flex-1 @2xl:border-l @2xl:border-dashed @2xl:border-border-strong">
            {ready ? (
              <Stamp label={pass.stamp} className="px-2 motion-safe:animate-stamp-in" />
            ) : (
              <div className="px-2">
                <p className={LABEL}>{ticket.missingLabel}</p>
                <p className="mt-1 text-label-lg text-text">{listFormat.format(missingLabels)}</p>
              </div>
            )}
            <Slot interactive={interactive} onClick={() => edit("extras")} className={`text-left ${FIELD}`}>
              <span className={LABEL}>
                {pass.extras}
                {interactive && <Pencil aria-hidden="true" className={EDIT_ICON} />}
              </span>
              <span className="mt-1 block text-body-sm text-text">
                {filledExtras > 0 ? fillTemplate(pass.extrasFilled, { count: filledExtras }) : ticket.extrasEmpty}
              </span>
            </Slot>
            <div className="@2xl:mt-auto">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
