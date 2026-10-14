"use client";

import { Plus, Users, X } from "lucide-react";
import { type CSSProperties, type Dispatch, useEffect, useRef, useState } from "react";
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
import GroupLines from "./GroupLines";
import MemberAvatar from "@/components/ui/MemberAvatar";
import MemberEditor from "./MemberEditor";
import SavedProfilesPicker from "@/components/saved-profiles/SavedProfilesPicker";
import { FIELD_LABEL, TEXT_LINK } from "@/components/ui/styles";

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
// A character over its name, with no outline until it is hovered or picked: the four ways to add someone and the
// people already in the group read as two quiet rows of faces, not as a stack of boxes.
const CREW_TILE =
  "surface-compact flex w-full min-w-0 cursor-pointer flex-col items-center gap-2 rounded-surface border border-transparent p-surface text-center transition-[background-color,border-color,scale] duration-150 ease-out active:scale-[0.97]";

function hasDetails(member: Member): boolean {
  return (
    member.name.trim() !== "" ||
    member.age !== null ||
    member.needs.length > 0 ||
    member.customNeeds.length > 0 ||
    member.allergies.trim() !== "" ||
    (member.phone ?? "").trim() !== "" ||
    Object.keys(member.interests).length > 0 ||
    member.customInterests.length > 0
  );
}

export default function CrewGrid({ draft, dispatch, text, selectedId, inlinePanel, onSelect }: CrewGridProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  // The people already in the group when the step opened arrive as a list; anyone added after pops in alone.
  const [firstIds] = useState(() => new Set(draft.members.map((member) => member.id)));
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
      <div role="group" aria-labelledby="crew-add-title">
        <div className="flex flex-wrap items-center justify-between gap-x-4">
          <p id="crew-add-title" className={FIELD_LABEL}>
            {text.crew.addLegend}
          </p>
          <button type="button" onClick={() => setPickerOpen(true)} className={TEXT_LINK}>
            <Users className="size-4" aria-hidden="true" />
            {text.crew.savedTitle}
          </button>
        </div>

        <SavedProfilesPicker
          open={pickerOpen}
          currentMembers={draft.members}
          onClose={() => setPickerOpen(false)}
          onAddMember={(member) => {
            dispatch({ type: "addMember", member });
            if (!inlinePanel) onSelect(member.id);
          }}
        />

        <div className="mt-2 grid grid-cols-4 gap-2">
          {AGE_GROUPS.map((ageGroup) => (
            <button
              key={ageGroup}
              type="button"
              disabled={full}
              aria-label={fillTemplate(text.crew.add, { ageGroup: text.ageGroups[ageGroup] })}
              onClick={() => addMember(ageGroup)}
              className={`${CREW_TILE} hover:bg-primary-subtle disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <span className="relative shrink-0">
                <MemberAvatar ageGroup={ageGroup} variant={ADD_VARIANTS[ageGroup]} className="size-12" />
                <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-background bg-primary text-on-primary">
                  <Plus className="size-3" strokeWidth={3} aria-hidden="true" />
                </span>
              </span>
              <span className="w-full truncate text-caption font-bold text-text">{text.ageGroups[ageGroup]}</span>
            </button>
          ))}
        </div>

        {inlinePanel && draft.members.length === 0 && (
          <p className="mt-2 text-body-sm text-text-muted">{text.crew.empty}</p>
        )}
      </div>

      {draft.members.length > 0 && (
        <div>
          <p id="crew-members-title" className={FIELD_LABEL}>
            {text.pass.manifest}
          </p>
          <ul aria-labelledby="crew-members-title" className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {draft.members.map((member, index) => {
              const order = { "--item-index": index } as CSSProperties;
              const active = member.id === selectedId;
              const confirming = member.id === confirmingId;
              const name = getMemberName(member, draft.members, text.ageGroups);
              const needCount = member.needs.length + member.customNeeds.length;
              return (
                <li
                  key={member.id}
                  style={order}
                  className={`relative ${firstIds.has(member.id) ? "motion-safe:animate-list-in" : "motion-safe:animate-pop-in"}`}
                >
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelect(active ? null : member.id)}
                    className={`${CREW_TILE} ${
                      active ? "border-primary bg-primary-subtle" : "hover:bg-surface-muted"
                    }`}
                  >
                    <span className="relative">
                      <MemberAvatar ageGroup={member.ageGroup} variant={index} className="size-16" />
                      {needCount > 0 && (
                        <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-background bg-accent text-caption font-bold text-on-accent tabular-nums">
                          <span aria-hidden="true">{needCount}</span>
                          <span className="sr-only">{fillTemplate(text.crew.needsCount, { count: needCount })}</span>
                        </span>
                      )}
                    </span>
                    <span className="w-full truncate text-label text-text">{name}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={fillTemplate(confirming ? text.crew.removeConfirmLabel : text.pass.removeMember, { name })}
                    title={fillTemplate(text.pass.removeMember, { name })}
                    onClick={() => removeMember(member)}
                    className="group/remove absolute -top-2 -right-2 inline-flex h-11 min-w-11 cursor-pointer items-center justify-center"
                  >
                    <span
                      className={`flex h-7 min-w-7 items-center justify-center rounded-full border text-caption font-bold shadow-sm shadow-neutral-950/10 transition-[background-color,border-color,color,scale] duration-150 ease-out group-active/remove:scale-[0.94] ${
                        confirming
                          ? "border-error bg-error px-2 text-on-error"
                          : "border-border-strong bg-background px-1 text-text-muted group-hover/remove:border-error group-hover/remove:text-error"
                      }`}
                    >
                      {confirming ? text.crew.removeConfirm : <X className="size-4" aria-hidden="true" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* On a phone the chosen person's details open right under the group, next to the character tapped. */}
          {inlinePanel && selected && (
            <div
              id="crew-panel"
              key={selected.id}
              className="mt-4 rounded-surface border border-primary bg-surface p-surface motion-safe:animate-message-in"
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
      )}

      <GroupLines members={draft.members} text={text} destination={text.stages.pass} />
    </div>
  );
}
