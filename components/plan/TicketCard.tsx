"use client";

import { Pencil, Plane, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import type { Messages } from "@/lib/messages";
import {
  type PlanDraft,
  countFilledDetails,
  fillTemplate,
  getMemberName,
  hasBudget,
  hasDateError,
  hasDates,
  parseLocalDate,
} from "@/lib/plan-draft";
import { type QuestionKey, missingRequired } from "@/lib/plan-questions";
import { useLocale } from "@/lib/use-locale";
import MemberAvatar from "./MemberAvatar";
import { NeedSummary } from "./NeedChips";

type TicketCardProps = {
  draft: PlanDraft;
  text: Messages["plan"];
  arriving?: boolean;
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
const NOTCH = "absolute size-6 rounded-full border border-border bg-background dark:border-primary/25";
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

function ReadyStamp({ label }: { label: string }) {
  return (
    <p className="flex -rotate-3 items-center gap-2 text-success motion-safe:animate-stamp-in">
      <svg viewBox="0 0 48 48" aria-hidden="true" className="size-10 shrink-0" fill="none" stroke="currentColor">
        <circle cx="24" cy="24" r="22" strokeWidth="2" />
        <circle cx="24" cy="24" r="17" strokeWidth="1" strokeDasharray="2 3" />
        <path d="M15 24.5l6 6 12-13" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-label font-extrabold tracking-wider uppercase">{label}</span>
    </p>
  );
}

export default function TicketCard({ draft, text, arriving = false, onEdit, onAddMember, children }: TicketCardProps) {
  const locale = useLocale();
  const pass = text.pass;
  const ticket = text.ticket;
  const interactive = onEdit !== undefined;
  const edit = (question: QuestionKey, memberId?: string) => onEdit?.(question, memberId);
  const missing = missingRequired(draft);
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
    { question: "dates", label: pass.dates, value: dates },
    { question: "crew", label: pass.group, value: group },
    { question: "budget", label: pass.budget, value: budget },
    { question: "pace", label: pass.pace, value: pace },
  ];
  const shown = interactive ? draft.members : draft.members.slice(0, MAX_SHOWN);
  const hidden = draft.members.length - shown.length;
  const missingLabels = missing.map((question) => text.deck.questions[question].short);
  const status = (label: string, value: string) =>
    fillTemplate(pass.fieldStatus, { label, value: value || pass.empty });
  const slotPad = interactive ? "-mx-3 rounded-xl px-3 py-2" : "";

  return (
    <div
      className={`overflow-clip rounded-3xl bg-surface shadow-xl ring-1 shadow-neutral-950/10 ring-border ring-inset md:grid md:grid-cols-[minmax(0,1fr)_18rem] dark:ring-primary/25 ${
        arriving ? "motion-safe:animate-ticket-in" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex h-10 items-center gap-2 bg-primary px-6 text-on-primary">
          <Plane className="size-4" aria-hidden="true" />
          <p className="text-label">{pass.brand}</p>
        </div>

        <div className="px-6 pt-5 pb-5">
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_minmax(3rem,1fr)_minmax(0,1fr)] sm:items-end">
            <Slot
              interactive={interactive}
              label={status(pass.origin, origin)}
              onClick={() => edit("origin")}
              className={`min-w-0 text-left ${slotPad}`}
            >
              <span className={LABEL}>
                {ticket.from}
                {interactive && <Pencil aria-hidden="true" className={EDIT_ICON} />}
              </span>
              <span
                className={`block truncate font-heading text-h2 uppercase ${
                  origin ? "font-extrabold text-text" : "text-text-muted"
                }`}
              >
                {origin || EMPTY_MARK}
              </span>
            </Slot>
            <div aria-hidden="true" className="flex items-center gap-3 text-primary sm:pb-3">
              <span className="hidden h-px flex-1 border-t border-dashed border-border-strong sm:block" />
              <Plane className="size-5 rotate-90 sm:rotate-0" />
              <span className="h-px flex-1 border-t border-dashed border-border-strong" />
            </div>
            <Slot
              interactive={interactive}
              label={status(pass.destinations, destination)}
              onClick={() => edit("destination")}
              className={`min-w-0 text-left sm:text-right ${slotPad}`}
            >
              <span className={`${LABEL} sm:justify-end`}>
                {ticket.to}
                {interactive && <Pencil aria-hidden="true" className={EDIT_ICON} />}
              </span>
              <span
                className={`block truncate font-heading text-h2 uppercase ${
                  destination ? "font-extrabold text-text" : "text-text-muted"
                }`}
              >
                {destination || EMPTY_MARK}
              </span>
            </Slot>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {fields.map((field) => (
              <Slot
                key={field.question}
                interactive={interactive}
                label={status(field.label, field.value)}
                onClick={() => edit(field.question)}
                className={`min-w-0 text-left ${slotPad}`}
              >
                <span className={LABEL}>
                  {field.label}
                  {interactive && <Pencil aria-hidden="true" className={EDIT_ICON} />}
                </span>
                <span
                  className={`mt-1 block truncate rounded-sm font-heading text-h3 ${
                    field.value ? "font-extrabold text-text motion-safe:animate-pass-print" : "text-text-muted"
                  }`}
                >
                  {field.value || EMPTY_MARK}
                </span>
              </Slot>
            ))}
          </div>
        </div>

        <div className="border-t border-border px-6 pt-3 pb-5">
          <div className="flex min-h-11 items-center justify-between gap-2">
            <h2 className="font-sans text-caption font-bold tracking-wider text-text-muted uppercase">{pass.manifest}</h2>
            {interactive && (
              <button
                type="button"
                onClick={onAddMember}
                className="-mr-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-3 text-label text-primary transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.97]"
              >
                <UserPlus className="size-4" aria-hidden="true" />
                {pass.addMember}
              </button>
            )}
          </div>
          {draft.members.length === 0 && <p className="text-body-sm text-text-muted">{pass.noMembers}</p>}
          {draft.members.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {shown.map((member, index) => (
                <li key={member.id}>
                  <Slot
                    interactive={interactive}
                    onClick={() => edit("crew", member.id)}
                    className={`flex items-center gap-2 rounded-full border border-border pl-1 text-label text-text ${
                      interactive ? "min-h-11 pr-4" : "py-1 pr-3"
                    }`}
                  >
                    <MemberAvatar ageGroup={member.ageGroup} variant={index} className={interactive ? "size-9" : "size-7"} />
                    {getMemberName(member, draft.members, text.ageGroups)}
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

      <div className="relative border-t border-dashed border-border-strong md:flex md:flex-col md:border-t-0">
        <span aria-hidden="true" className={`${NOTCH} -top-3 -left-3`} />
        <span
          aria-hidden="true"
          className={`${NOTCH} -top-3 -right-3 md:top-auto md:right-auto md:-bottom-3 md:-left-3`}
        />
        <div aria-hidden="true" className="hidden h-10 bg-primary md:block" />
        <div className="flex flex-col gap-4 px-6 py-5 md:flex-1 md:border-l md:border-dashed md:border-border-strong">
          {ready ? (
            <ReadyStamp label={pass.stamp} />
          ) : (
            <div>
              <p className={LABEL}>{ticket.missingLabel}</p>
              <p className="mt-1 text-label-lg text-text">{listFormat.format(missingLabels)}</p>
            </div>
          )}
          <Slot interactive={interactive} onClick={() => edit("extras")} className={`text-left ${slotPad}`}>
            <span className={LABEL}>
              {pass.extras}
              {interactive && <Pencil aria-hidden="true" className={EDIT_ICON} />}
            </span>
            <span className="mt-1 block text-body-sm text-text">
              {filledExtras > 0 ? fillTemplate(pass.extrasFilled, { count: filledExtras }) : ticket.extrasEmpty}
            </span>
          </Slot>
          <div className="md:mt-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
