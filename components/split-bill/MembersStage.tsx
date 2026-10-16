"use client";

import { ArrowRight, Plus, Users, X } from "lucide-react";
import { type FormEvent, type Ref, useId, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import IconButton from "@/components/ui/IconButton";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { FIELD_LABEL, INPUT, INPUT_BUTTON, TEXT_LINK, buttonClass } from "@/components/ui/styles";
import { useListArrival } from "@/components/ui/use-list-arrival";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { BILL_LIMITS, type SplitBill } from "@/lib/split-bill/bill";
import { memberNameTaken } from "@/lib/split-bill/edit";
import { plural } from "@/lib/trips/format";
import DeckFooter from "@/components/plan/DeckFooter";
import { NEXT_ARROW } from "./stage-arrows";
import FieldError from "@/components/ui/FieldError";

type MembersStageProps = {
  bill: SplitBill;
  text: Messages["splitBill"]["members"];
  locale: string;
  headingRef: Ref<HTMLHeadingElement>;
  onAdd: (name: string) => void;
  onRemove: (memberId: string) => void;
  onOpenSaved: () => void;
  onNext: () => void;
};

export default function MembersStage({ bill, text, locale, headingRef, onAdd, onRemove, onOpenSaved, onNext }: MembersStageProps) {
  const [name, setName] = useState("");
  const [problem, setProblem] = useState("");
  const inputId = useId();
  const problemId = useId();
  const headingId = useId();
  const full = bill.members.length >= BILL_LIMITS.members;
  const arrivalOf = useListArrival(bill.members.map((member) => member.id));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "") return;
    if (memberNameTaken(bill, trimmed)) {
      setProblem(fillTemplate(text.duplicate, { name: trimmed }));
      return;
    }
    onAdd(trimmed);
    setName("");
    setProblem("");
  };

  return (
    <section aria-labelledby={headingId} className="motion-safe:animate-message-in">
      {/* From 1024px the form stands beside the group it fills, so a name added appears without scrolling. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <div className="rounded-surface border border-border bg-surface p-surface">
          <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-h2 text-balance text-text outline-none">
            {text.heading}
          </h2>
          <p className="mt-2 text-body text-pretty text-text-muted">{text.hint}</p>

          <form onSubmit={submit} noValidate className="mt-6">
            <label htmlFor={inputId} className={FIELD_LABEL}>
              {text.nameLabel}
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id={inputId}
                type="text"
                value={name}
                maxLength={BILL_LIMITS.nameLength}
                autoComplete="off"
                enterKeyHint="done"
                disabled={full}
                placeholder={text.placeholder}
                aria-invalid={problem !== ""}
                aria-describedby={problem ? problemId : undefined}
                onChange={(event) => {
                  setName(event.target.value);
                  setProblem("");
                }}
                className={`${INPUT} min-w-0 aria-invalid:border-error`}
              />
              <button type="submit" disabled={full || name.trim() === ""} className={INPUT_BUTTON}>
                <Plus className="size-4" aria-hidden="true" />
                {text.add}
              </button>
            </div>
            {problem && (
              <FieldError id={problemId} role="alert">{problem}</FieldError>
            )}
            {full && (
              <p className="mt-2 text-body-sm text-text-muted">{fillTemplate(text.full, { count: BILL_LIMITS.members })}</p>
            )}
          </form>

          {/* The other way to fill the group, read with the field it stands in for. */}
          <button type="button" onClick={onOpenSaved} className={`${TEXT_LINK} mt-2`}>
            <Users className="size-4" aria-hidden="true" />
            {text.fromSaved}
          </button>
        </div>

        {bill.members.length > 0 ? (
          <div>
            <h3 className="flex flex-wrap items-baseline justify-between gap-x-3 text-h3 text-text">
              {text.listHeading}
              <span className="text-label text-text-muted tabular-nums">{plural(text.count, bill.members.length, locale)}</span>
            </h3>
            <ul className="mt-4 divide-y divide-border overflow-clip rounded-surface border border-border bg-surface">
              {bill.members.map((member, index) => {
                const arrival = arrivalOf(member.id);
                return (
                  <li key={member.id} style={arrival.style} className={`flex items-center gap-3 px-surface py-2 ${arrival.className}`}>
                    <MemberAvatar ageGroup="adult" variant={index} className="size-10" />
                    <span className="min-w-0 flex-1 truncate text-label-lg text-text">{member.name}</span>
                    <IconButton label={fillTemplate(text.remove, { name: member.name })} onClick={() => onRemove(member.id)} className="group/remove -mr-2">
                      <X className="size-5 text-text-muted transition-colors duration-150 group-hover/remove:text-error" aria-hidden="true" />
                    </IconButton>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <EmptyState icon={Users} title={text.emptyTitle} body={text.empty} />
        )}
      </div>

      <div className="mt-8">
        <DeckFooter backLabel="" onBack={null} note={null}>
          <button type="button" disabled={bill.members.length === 0} onClick={onNext} className={`group ${buttonClass("primary")}`}>
            {text.next}
            <ArrowRight className={NEXT_ARROW} aria-hidden="true" />
          </button>
        </DeckFooter>
      </div>
    </section>
  );
}
