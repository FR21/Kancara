"use client";

import { Check, Trash2, X } from "lucide-react";
import type { Dispatch } from "react";
import type { Messages } from "@/lib/messages";
import {
  type Member,
  type PlanDraft,
  type PlanDraftAction,
  AGE_GROUPS,
  fillTemplate,
  getMemberName,
  INTEREST_KEYS,
  MAX_AGE,
  NEED_CATEGORIES,
  NEED_CATEGORY_KEYS,
  NEED_KEYS,
  sameText,
} from "@/lib/plan-draft";
import Checkbox from "./Checkbox";
import CustomAdd, { CustomChip } from "./CustomEntries";
import SegmentedToggle from "./SegmentedToggle";
import { choiceClass, FIELD_LABEL, INPUT } from "./styles";

type MemberEditorProps = {
  member: Member;
  draft: PlanDraft;
  dispatch: Dispatch<PlanDraftAction>;
  text: Messages["plan"];
  onRemoved: () => void;
};

const WISH_LEVELS = ["nice", "must"] as const;
const WISH_TOGGLE = "mb-2 ml-9 motion-safe:animate-message-in";
const MAX_NAME_CHARS = 40;
const MAX_ALLERGY_CHARS = 120;

export default function MemberEditor({ member, draft, dispatch, text, onRemoved }: MemberEditorProps) {
  const displayName = getMemberName(member, draft.members, text.ageGroups);

  const removeMember = () => {
    dispatch({ type: "removeMember", id: member.id });
    onRemoved();
  };

  const setAge = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 3);
    dispatch({ type: "setMemberAge", id: member.id, age: digits ? Math.min(Number(digits), MAX_AGE) : null });
  };

  // Typing the name of a listed choice picks that choice instead of adding a twin of it.
  const addNeed = (value: string) => {
    const listed = NEED_KEYS.find((need) => sameText(text.needs[need], value));
    if (!listed) dispatch({ type: "addMemberCustomNeed", id: member.id, value });
    else if (!member.needs.includes(listed)) dispatch({ type: "toggleMemberNeed", id: member.id, need: listed });
  };

  const addInterest = (value: string) => {
    const listed = INTEREST_KEYS.find((interest) => sameText(text.interests[interest], value));
    const typedBefore = member.customInterests.some((wish) => sameText(wish.label, value));
    if (listed && member.interests[listed] === undefined) {
      dispatch({ type: "setMemberInterest", id: member.id, interest: listed, level: "nice" });
    }
    if (!listed && !typedBefore) {
      dispatch({ type: "setMemberCustomInterest", id: member.id, label: value, level: "nice" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="member-name" className={FIELD_LABEL}>
          {text.pass.memberName}
        </label>
        <input
          id="member-name"
          type="text"
          autoComplete="off"
          maxLength={MAX_NAME_CHARS}
          value={member.name}
          placeholder={text.pass.memberNamePlaceholder}
          onChange={(event) => dispatch({ type: "updateMember", id: member.id, changes: { name: event.target.value } })}
          className={`${INPUT} mt-2`}
        />
      </div>

      <fieldset className="min-w-0">
        <legend className={FIELD_LABEL}>{text.pass.ageGroup}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {AGE_GROUPS.map((ageGroup) => {
            const selected = member.ageGroup === ageGroup;
            return (
              <button
                key={ageGroup}
                type="button"
                aria-pressed={selected}
                onClick={() => dispatch({ type: "updateMember", id: member.id, changes: { ageGroup } })}
                className={choiceClass(selected)}
              >
                {selected && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
                {text.ageGroups[ageGroup]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="member-age" className={`${FIELD_LABEL} block`}>
          {text.pass.age}
        </label>
        <input
          id="member-age"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={member.age ?? ""}
          placeholder={text.pass.agePlaceholder}
          aria-describedby="member-age-hint"
          onChange={(event) => setAge(event.target.value)}
          className={`${INPUT} mt-2 max-w-40 tabular-nums`}
        />
        <p id="member-age-hint" className="mt-2 text-caption text-text-muted">
          {text.pass.ageHint}
        </p>
      </div>

      <fieldset className="min-w-0">
        <legend className={FIELD_LABEL}>{text.pass.needsLegend}</legend>
        <p className="mt-1 text-body-sm text-text-muted">{text.pass.needsHint}</p>
        <div className="mt-3 space-y-3">
          {NEED_CATEGORY_KEYS.map((category) => (
            <div key={category} className="sm:grid sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4">
              <p className="pt-3 text-caption font-bold text-text-muted">{text.needCategories[category]}</p>
              <div className="mt-1 min-w-0 sm:mt-0">
                <div className="flex flex-wrap gap-2">
                  {NEED_CATEGORIES[category].map((need) => {
                    const selected = member.needs.includes(need);
                    return (
                      <button
                        key={need}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => dispatch({ type: "toggleMemberNeed", id: member.id, need })}
                        className={choiceClass(selected)}
                      >
                        {selected && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
                        {text.needs[need]}
                      </button>
                    );
                  })}
                  {category === "other" &&
                    member.customNeeds.map((need) => (
                      <CustomChip
                        key={need}
                        label={need}
                        text={text.custom}
                        onRemove={() => dispatch({ type: "removeMemberCustomNeed", id: member.id, value: need })}
                      />
                    ))}
                </div>
                {category === "other" && (
                  <div className="mt-3">
                    <CustomAdd
                      id="member-custom-need"
                      label={text.custom.need}
                      placeholder={text.custom.needPlaceholder}
                      count={member.customNeeds.length}
                      text={text.custom}
                      onAdd={addNeed}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="member-allergies" className={FIELD_LABEL}>
          {text.pass.allergies}
        </label>
        <input
          id="member-allergies"
          type="text"
          autoComplete="off"
          maxLength={MAX_ALLERGY_CHARS}
          value={member.allergies}
          placeholder={text.pass.allergiesPlaceholder}
          onChange={(event) =>
            dispatch({ type: "updateMember", id: member.id, changes: { allergies: event.target.value } })
          }
          className={`${INPUT} mt-2`}
        />
      </div>

      <fieldset className="min-w-0">
        <legend className={FIELD_LABEL}>{text.pass.interestsLegend}</legend>
        <ul className="mt-2 divide-y divide-border">
          {INTEREST_KEYS.map((interest) => {
            const level = member.interests[interest];
            return (
              <li key={interest} className="py-1">
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body-sm text-text">
                  <Checkbox
                    checked={level !== undefined}
                    onChange={(checked) =>
                      dispatch({
                        type: "setMemberInterest",
                        id: member.id,
                        interest,
                        level: checked ? "nice" : null,
                      })
                    }
                  />
                  {text.interests[interest]}
                </label>
                {level !== undefined && (
                  <SegmentedToggle
                    name={`interest-${member.id}-${interest}`}
                    label={text.interests[interest]}
                    options={WISH_LEVELS}
                    labels={text.wishLevels}
                    value={level}
                    className={WISH_TOGGLE}
                    onChange={(option) =>
                      dispatch({ type: "setMemberInterest", id: member.id, interest, level: option })
                    }
                  />
                )}
              </li>
            );
          })}
          {member.customInterests.map((wish, index) => {
            const removeLabel = fillTemplate(text.custom.remove, { name: wish.label });
            return (
              <li key={wish.label} className="py-1 motion-safe:animate-message-in">
                <div className="flex min-h-11 items-center gap-3 text-body-sm text-text">
                  <span
                    aria-hidden="true"
                    className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-on-primary"
                  >
                    <Check className="size-4" strokeWidth={3.5} />
                  </span>
                  <span className="min-w-0 flex-1 wrap-anywhere">{wish.label}</span>
                  <button
                    type="button"
                    aria-label={removeLabel}
                    title={removeLabel}
                    onClick={() =>
                      dispatch({ type: "setMemberCustomInterest", id: member.id, label: wish.label, level: null })
                    }
                    className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-muted transition-[background-color,color,scale] duration-150 ease-out hover:bg-error-subtle hover:text-error active:scale-[0.95]"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <SegmentedToggle
                  name={`interest-${member.id}-custom-${index}`}
                  label={wish.label}
                  options={WISH_LEVELS}
                  labels={text.wishLevels}
                  value={wish.level}
                  className={WISH_TOGGLE}
                  onChange={(option) =>
                    dispatch({ type: "setMemberCustomInterest", id: member.id, label: wish.label, level: option })
                  }
                />
              </li>
            );
          })}
        </ul>
        <div className="mt-3">
          <CustomAdd
            id="member-custom-interest"
            label={text.custom.interest}
            placeholder={text.custom.interestPlaceholder}
            count={member.customInterests.length}
            text={text.custom}
            onAdd={addInterest}
          />
        </div>
      </fieldset>

      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={removeMember}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-3 text-label text-text-muted transition-[background-color,color,scale] duration-150 ease-out hover:bg-error-subtle hover:text-error focus-visible:text-error active:scale-[0.97]"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {fillTemplate(text.pass.removeMember, { name: displayName })}
        </button>
      </div>
    </div>
  );
}
