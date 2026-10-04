"use client";

import { Check, Trash2 } from "lucide-react";
import type { Dispatch } from "react";
import type { Messages } from "@/lib/messages";
import {
  type Member,
  type PlanDraft,
  type PlanDraftAction,
  type WishLevel,
  AGE_GROUPS,
  fillTemplate,
  getMemberName,
  INTEREST_KEYS,
  NEED_CATEGORIES,
  NEED_CATEGORY_KEYS,
} from "@/lib/plan-draft";
import Checkbox from "./Checkbox";
import { choiceClass, EASE, FIELD_LABEL, INPUT } from "./styles";

type MemberEditorProps = {
  member: Member;
  draft: PlanDraft;
  dispatch: Dispatch<PlanDraftAction>;
  text: Messages["plan"];
  onRemoved: () => void;
};

const WISH_LEVELS: WishLevel[] = ["nice", "must"];

export default function MemberEditor({ member, draft, dispatch, text, onRemoved }: MemberEditorProps) {
  const displayName = getMemberName(member, draft.members, text.ageGroups);

  const removeMember = () => {
    dispatch({ type: "removeMember", id: member.id });
    onRemoved();
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
          value={member.name}
          placeholder={text.pass.memberNamePlaceholder}
          onChange={(event) => dispatch({ type: "updateMember", id: member.id, changes: { name: event.target.value } })}
          className={`${INPUT} mt-2`}
        />
      </div>

      <fieldset>
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

      <fieldset>
        <legend className={FIELD_LABEL}>{text.pass.needsLegend}</legend>
        <p className="mt-1 text-body-sm text-text-muted">{text.pass.needsHint}</p>
        <div className="mt-3 space-y-3">
          {NEED_CATEGORY_KEYS.map((category) => (
            <div key={category} className="sm:grid sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4">
              <p className="pt-3 text-caption font-bold text-text-muted">{text.needCategories[category]}</p>
              <div className="mt-1 flex flex-wrap gap-2 sm:mt-0">
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
          value={member.allergies}
          placeholder={text.pass.allergiesPlaceholder}
          onChange={(event) =>
            dispatch({ type: "updateMember", id: member.id, changes: { allergies: event.target.value } })
          }
          className={`${INPUT} mt-2`}
        />
      </div>

      <fieldset>
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
                  <div
                    role="group"
                    aria-label={text.interests[interest]}
                    className="relative mb-2 ml-9 grid w-fit grid-cols-2 rounded-full border border-border-strong p-0.5 motion-safe:animate-message-in"
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-full bg-primary transition-[translate] duration-200 ${EASE} motion-reduce:transition-none ${
                        level === "must" ? "translate-x-full" : ""
                      }`}
                    />
                    {WISH_LEVELS.map((option) => (
                      <label key={option} className="relative cursor-pointer">
                        <input
                          type="radio"
                          name={`interest-${member.id}-${interest}`}
                          checked={level === option}
                          onChange={() =>
                            dispatch({ type: "setMemberInterest", id: member.id, interest, level: option })
                          }
                          className="peer sr-only"
                        />
                        <span className="flex h-11 items-center justify-center rounded-full px-4 text-label text-text-muted transition-colors duration-150 ease-out peer-checked:text-on-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
                          {text.wishLevels[option]}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
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
