"use client";

import { Plus, X } from "lucide-react";
import { type Dispatch, useEffect, useRef, useState } from "react";
import type { Messages } from "@/lib/messages";
import {
  type AgeGroup,
  type Member,
  type PlanDraft,
  type PlanDraftAction,
  AGE_GROUPS,
  createMember,
  fillTemplate,
  getMemberName,
  MAX_MEMBERS,
} from "@/lib/plan-draft";
import { revealInScroller } from "@/lib/reveal-in-scroller";
import MemberAvatar from "./MemberAvatar";
import MemberEditor from "./MemberEditor";
import { FIELD_LABEL } from "./styles";

type CrewGridProps = {
  draft: PlanDraft;
  dispatch: Dispatch<PlanDraftAction>;
  text: Messages["plan"];
  selectedId: string | null;
  inlinePanel: boolean;
  onSelect: (id: string | null) => void;
};

const ADD_VARIANTS: Record<AgeGroup, number> = { adult: 0, elderly: 1, child: 2, toddler: 3 };
const CONFIRM_MS = 3000;

function hasDetails(member: Member): boolean {
  return (
    member.name.trim() !== "" ||
    member.age !== null ||
    member.needs.length > 0 ||
    member.customNeeds.length > 0 ||
    member.allergies.trim() !== "" ||
    Object.keys(member.interests).length > 0 ||
    member.customInterests.length > 0
  );
}

export default function CrewGrid({ draft, dispatch, text, selectedId, inlinePanel, onSelect }: CrewGridProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const confirmTimerRef = useRef<number | null>(null);
  const full = draft.members.length >= MAX_MEMBERS;
  const selected = draft.members.find((member) => member.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId === null || !inlinePanel) return;
    const panel = document.getElementById("crew-panel");
    if (panel) revealInScroller(panel);
  }, [selectedId, inlinePanel]);

  useEffect(
    () => () => {
      if (confirmTimerRef.current !== null) window.clearTimeout(confirmTimerRef.current);
    },
    [],
  );

  const addMember = (ageGroup: AgeGroup) => {
    const member = createMember(ageGroup);
    dispatch({ type: "addMember", member });
    if (!inlinePanel) onSelect(member.id);
  };

  const removeMember = (member: Member) => {
    if (confirmTimerRef.current !== null) window.clearTimeout(confirmTimerRef.current);
    if (hasDetails(member) && confirmingId !== member.id) {
      setConfirmingId(member.id);
      confirmTimerRef.current = window.setTimeout(() => setConfirmingId(null), CONFIRM_MS);
      return;
    }
    setConfirmingId(null);
    if (member.id === selectedId) onSelect(null);
    dispatch({ type: "removeMember", id: member.id });
  };

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className={FIELD_LABEL}>{text.crew.addLegend}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {AGE_GROUPS.map((ageGroup) => (
            <button
              key={ageGroup}
              type="button"
              disabled={full}
              aria-label={fillTemplate(text.crew.add, { ageGroup: text.ageGroups[ageGroup] })}
              onClick={() => addMember(ageGroup)}
              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border-strong py-2 pr-3 pl-2 text-label text-text transition-[background-color,border-color,scale] duration-150 ease-out hover:border-primary hover:bg-primary-subtle active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="relative shrink-0">
                <MemberAvatar ageGroup={ageGroup} variant={ADD_VARIANTS[ageGroup]} className="size-10" />
                <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border-2 border-background bg-primary text-on-primary">
                  <Plus className="size-3" strokeWidth={3} aria-hidden="true" />
                </span>
              </span>
              <span className="min-w-0 flex-1 truncate text-left">{text.ageGroups[ageGroup]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {inlinePanel && draft.members.length === 0 && (
        <p className="text-body-sm text-text-muted">{text.crew.empty}</p>
      )}

      {draft.members.length > 0 && (
        <ul aria-label={text.pass.manifest} className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {draft.members.map((member, index) => {
            const active = member.id === selectedId;
            const confirming = member.id === confirmingId;
            const name = getMemberName(member, draft.members, text.ageGroups);
            const needCount = member.needs.length + member.customNeeds.length;
            return (
              <li key={member.id} className="relative motion-safe:animate-message-in">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(active ? null : member.id)}
                  className={`flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border px-2 pt-4 pb-3 transition-[background-color,border-color,scale] duration-150 ease-out active:scale-[0.97] ${
                    active
                      ? "border-primary bg-primary-subtle"
                      : "border-border bg-surface hover:border-border-strong hover:bg-surface-muted"
                  }`}
                >
                  <span className="relative">
                    <MemberAvatar ageGroup={member.ageGroup} variant={index} className="size-16" />
                    {needCount > 0 && (
                      <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-surface bg-accent text-caption font-bold text-on-accent tabular-nums">
                        <span aria-hidden="true">{needCount}</span>
                        <span className="sr-only">
                          {fillTemplate(text.crew.needsCount, { count: needCount })}
                        </span>
                      </span>
                    )}
                  </span>
                  <span className="w-full truncate text-center text-label text-text">{name}</span>
                </button>
                <button
                  type="button"
                  aria-label={fillTemplate(confirming ? text.crew.removeConfirmLabel : text.pass.removeMember, { name })}
                  title={fillTemplate(text.pass.removeMember, { name })}
                  onClick={() => removeMember(member)}
                  className="group/remove absolute -top-2 -right-2 inline-flex h-11 min-w-11 cursor-pointer items-center justify-center"
                >
                  <span
                    className={`flex h-7 min-w-7 items-center justify-center rounded-full border px-1 text-caption font-bold shadow-sm shadow-neutral-950/10 transition-[background-color,border-color,color,scale] duration-150 ease-out group-active/remove:scale-[0.94] ${
                      confirming
                        ? "border-error bg-error px-2 text-on-error"
                        : "border-border-strong bg-background text-text-muted group-hover/remove:border-error group-hover/remove:text-error"
                    }`}
                  >
                    {confirming ? text.crew.removeConfirm : <X className="size-4" aria-hidden="true" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {inlinePanel && draft.members.length > 0 && selected === null && (
        <p className="text-body-sm text-text-muted">{text.crew.selectHint}</p>
      )}

      {inlinePanel && selected && (
        <div
          id="crew-panel"
          key={selected.id}
          className="rounded-lg border border-primary bg-surface p-4 motion-safe:animate-message-in sm:p-6"
        >
          <MemberEditor
            member={selected}
            draft={draft}
            dispatch={dispatch}
            text={text}
            onRemoved={() => onSelect(null)}
          />
        </div>
      )}
    </div>
  );
}
