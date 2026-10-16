"use client";

import { Check, CircleAlert, Loader2 } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";
import FieldError from "@/components/ui/FieldError";
import RequiredMark from "@/components/ui/RequiredMark";
import SelectField from "@/components/ui/SelectField";
import Sheet from "@/components/ui/Sheet";
import { FIELD_LABEL, GHOST_BUTTON, INPUT, PRIMARY_BUTTON, TEXTAREA } from "@/components/ui/styles";
import { type SavedProfilesFailure, describeFailure } from "@/lib/client/saved-profiles";
import type { Messages } from "@/lib/messages";
import {
  type AgeGroup,
  type Member,
  type PlanDraftAction,
  AGE_GROUPS,
  EMPTY_DRAFT,
  fillTemplate,
  MAX_AGE,
  planDraftReducer,
  sameText,
} from "@/lib/plan-draft";
import {
  type SavedProfileDraft,
  MAX_PROFILE_NAME_CHARS,
  MAX_PROFILE_NOTES_CHARS,
  MAX_SAVED_PROFILES,
  profileToMember,
} from "@/lib/saved-profiles/profile";
import MemberNeedsFields from "@/components/members/MemberNeedsFields";
import MemberWishesFields from "@/components/members/MemberWishesFields";
import { FORM_GROUP, FORM_GROUPS } from "@/components/members/form-groups";

/** Who the editor opens on: a saved person (with their id), or a new one, empty or taken from a past trip. */
export type EditorTarget = { id: string | null; draft: SavedProfileDraft };

type SavedProfileEditorProps = {
  target: EditorTarget;
  planText: Messages["plan"];
  text: Messages["savedProfiles"];
  onClose: () => void;
  /** Keeps the profile. It throws when that fails, and the editor stays open to try again. */
  onSave: (draft: SavedProfileDraft, id: string | null) => Promise<void>;
};

// The person is edited with the plan's own rules for a member, so caps, repeats, and an age that keeps its age
// group in step behave exactly as they do while planning.
function editMember(member: Member, action: PlanDraftAction): Member {
  return planDraftReducer({ ...EMPTY_DRAFT, members: [member] }, action).members[0] ?? member;
}

export default function SavedProfileEditor({ target, planText, text, onClose, onSave }: SavedProfileEditorProps) {
  const fieldId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [member, setMember] = useState(() => profileToMember(target.draft));
  const [relationship, setRelationship] = useState(target.draft.relationship);
  const [notes, setNotes] = useState(target.draft.notes);
  const [nameMissing, setNameMissing] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<SavedProfilesFailure | null>(null);

  const edit = (action: PlanDraftAction) => setMember((current) => editMember(current, action));

  const setAge = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 3);
    edit({ type: "setMemberAge", id: member.id, age: digits ? Math.min(Number(digits), MAX_AGE) : null });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    if (member.name.trim() === "") {
      setNameMissing(true);
      nameRef.current?.focus();
      return;
    }
    setPending(true);
    setFailure(null);
    try {
      await onSave(
        {
          name: member.name,
          relationship,
          ageGroup: member.ageGroup,
          age: member.age,
          needs: member.needs,
          customNeeds: member.customNeeds,
          allergies: member.allergies,
          interests: member.interests,
          customInterests: member.customInterests,
          notes,
        },
        target.id,
      );
    } catch (error) {
      setFailure(describeFailure(error));
      setPending(false);
    }
  };

  // A relationship typed by hand before the list existed stays a choice of its own, so opening the profile does not
  // lose it. A listed one is matched however it was capitalised.
  const listedRelationship = text.editor.relationships.find((choice) => sameText(choice, relationship));
  const relationshipValue = listedRelationship ?? relationship;
  const relationshipChoices =
    relationshipValue === "" || listedRelationship !== undefined
      ? text.editor.relationships
      : [...text.editor.relationships, relationshipValue];

  const failureMessage = failure === "full" ? fillTemplate(text.errors.full, { count: MAX_SAVED_PROFILES }) : null;
  const formId = `${fieldId}-form`;

  return (
    <Sheet
      open
      title={target.id === null ? text.editor.titleAdd : text.editor.titleEdit}
      closeLabel={text.editor.close}
      onClose={onClose}
      footer={
        <>
          {failure && (
            <p role="alert" className="flex w-full items-start gap-2 text-body-sm text-error">
              <CircleAlert className="mt-1 size-4 shrink-0" aria-hidden="true" />
              {failureMessage ?? text.errors[failure]}
            </p>
          )}
          <button type="button" onClick={onClose} className={`${GHOST_BUTTON} sm:ml-auto`}>
            {text.editor.cancel}
          </button>
          <button type="submit" form={formId} disabled={pending} className={`${PRIMARY_BUTTON} flex-1 sm:flex-none`}>
            {pending ? (
              <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
            ) : (
              <Check className="size-4" aria-hidden="true" />
            )}
            {pending ? text.editor.saving : text.editor.save}
          </button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className={FORM_GROUPS}>
        <div className={FORM_GROUP}>
          <div>
            <label htmlFor={`${fieldId}-name`} className={`${FIELD_LABEL} block`}>
              {text.editor.name}
              <RequiredMark />
            </label>
            <input
              ref={nameRef}
              id={`${fieldId}-name`}
              type="text"
              autoComplete="off"
              required
              maxLength={MAX_PROFILE_NAME_CHARS}
              value={member.name}
              placeholder={text.editor.namePlaceholder}
              aria-invalid={nameMissing}
              aria-describedby={nameMissing ? `${fieldId}-name-error` : undefined}
              onChange={(event) => {
                setNameMissing(false);
                edit({ type: "updateMember", id: member.id, changes: { name: event.target.value } });
              }}
              className={`${INPUT} mt-2 aria-invalid:border-error`}
            />
            {nameMissing && (
              <FieldError id={`${fieldId}-name-error`}>{text.editor.nameMissing}</FieldError>
            )}
          </div>

          <div>
            <label htmlFor={`${fieldId}-relationship`} className={`${FIELD_LABEL} block`}>
              {text.editor.relationship}
            </label>
            <SelectField
              id={`${fieldId}-relationship`}
              value={relationshipValue}
              onChange={(event) => setRelationship(event.target.value)}
              className="mt-2"
            >
              <option value="">{text.editor.relationshipPlaceholder}</option>
              {relationshipChoices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </SelectField>
          </div>

          <div>
            <label htmlFor={`${fieldId}-age-group`} className={`${FIELD_LABEL} block`}>
              {planText.pass.ageGroup}
              <RequiredMark />
            </label>
            <SelectField
              id={`${fieldId}-age-group`}
              required
              value={member.ageGroup}
              onChange={(event) =>
                edit({ type: "updateMember", id: member.id, changes: { ageGroup: event.target.value as AgeGroup } })
              }
              className="mt-2"
            >
              {AGE_GROUPS.map((ageGroup) => (
                <option key={ageGroup} value={ageGroup}>
                  {planText.ageGroups[ageGroup]}
                </option>
              ))}
            </SelectField>
          </div>

          <div>
            <label htmlFor={`${fieldId}-age`} className={`${FIELD_LABEL} block`}>
              {planText.pass.age}
            </label>
            <input
              id={`${fieldId}-age`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={member.age ?? ""}
              placeholder={planText.pass.agePlaceholder}
              aria-describedby={`${fieldId}-age-hint`}
              onChange={(event) => setAge(event.target.value)}
              className={`${INPUT} mt-2 max-w-40 tabular-nums`}
            />
            <p id={`${fieldId}-age-hint`} className="mt-2 text-caption text-text-muted">
              {planText.pass.ageHint}
            </p>
          </div>
        </div>

        <div className={FORM_GROUP}>
          <MemberNeedsFields id={fieldId} member={member} planText={planText} onEdit={edit} />
        </div>

        <div className={FORM_GROUP}>
          <MemberWishesFields id={fieldId} member={member} planText={planText} onEdit={edit} />
        </div>

        <div className={FORM_GROUP}>
          <div>
            <label htmlFor={`${fieldId}-notes`} className={`${FIELD_LABEL} block`}>
              {text.editor.notes}
            </label>
            <textarea
              id={`${fieldId}-notes`}
              maxLength={MAX_PROFILE_NOTES_CHARS}
              value={notes}
              placeholder={text.editor.notesPlaceholder}
              aria-describedby={`${fieldId}-notes-hint`}
              onChange={(event) => setNotes(event.target.value)}
              // One size: longer notes scroll inside the box instead of the box being dragged taller.
              className={`${TEXTAREA} mt-2 block h-32 resize-none overflow-y-auto overscroll-contain`}
            />
            <p id={`${fieldId}-notes-hint`} className="mt-2 text-caption text-text-muted">
              {text.editor.notesHint}
            </p>
          </div>
        </div>
      </form>
    </Sheet>
  );
}
