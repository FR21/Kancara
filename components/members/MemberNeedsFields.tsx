"use client";

import { Check } from "lucide-react";
import CustomAdd, { CustomChip } from "@/components/plan/CustomAdd";
import { choiceClass, FIELD_LABEL, INPUT } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import { type Member, type PlanDraftAction, fillTemplate, NEED_CATEGORIES, NEED_CATEGORY_KEYS, NEED_KEYS, sameText } from "@/lib/plan-draft";
import { MAX_ALLERGIES_CHARS } from "@/lib/saved-profiles/profile";

type MemberNeedsFieldsProps = {
  /** Prefixes the ids of the fields, so they stay unique on the page. */
  id: string;
  member: Member;
  planText: Messages["plan"];
  onEdit: (action: PlanDraftAction) => void;
};

/** A person's needs, by category with room for one typed by hand, and their allergies. Planner and saved profiles. */
export default function MemberNeedsFields({ id, member, planText, onEdit }: MemberNeedsFieldsProps) {
  // Typing the name of a listed choice picks that choice instead of adding a twin of it.
  const addNeed = (value: string) => {
    const listed = NEED_KEYS.find((need) => sameText(planText.needs[need], value));
    if (!listed) onEdit({ type: "addMemberCustomNeed", id: member.id, value });
    else if (!member.needs.includes(listed)) onEdit({ type: "toggleMemberNeed", id: member.id, need: listed });
  };

  return (
    <>
      <fieldset className="min-w-0">
        <legend className={FIELD_LABEL}>{planText.pass.needsLegend}</legend>
        <p className="mt-1 text-body-sm text-text-muted">{planText.pass.needsHint}</p>
        <div className="mt-4 space-y-4">
          {NEED_CATEGORY_KEYS.map((category) => (
            <div key={category} className="sm:grid sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4">
              <p className="text-label text-text-muted sm:pt-3">{planText.needCategories[category]}</p>
              <div className="mt-1 min-w-0 sm:mt-0">
                <div className="flex flex-wrap gap-2">
                  {NEED_CATEGORIES[category].map((need) => {
                    const selected = member.needs.includes(need);
                    return (
                      <button
                        key={need}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onEdit({ type: "toggleMemberNeed", id: member.id, need })}
                        className={choiceClass(selected)}
                      >
                        {selected && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
                        {planText.needs[need]}
                      </button>
                    );
                  })}
                  {category === "other" &&
                    member.customNeeds.map((need) => (
                      <CustomChip
                        key={need}
                        label={need}
                        removeLabel={fillTemplate(planText.custom.remove, { name: need })}
                        onRemove={() => onEdit({ type: "removeMemberCustomNeed", id: member.id, value: need })}
                      />
                    ))}
                </div>
                {category === "other" && (
                  <div className="mt-4">
                    <CustomAdd
                      id={`${id}-custom-need`}
                      label={planText.custom.need}
                      placeholder={planText.custom.needPlaceholder}
                      count={member.customNeeds.length}
                      text={planText.custom}
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
        <label htmlFor={`${id}-allergies`} className={FIELD_LABEL}>
          {planText.pass.allergies}
        </label>
        <input
          id={`${id}-allergies`}
          type="text"
          autoComplete="off"
          maxLength={MAX_ALLERGIES_CHARS}
          value={member.allergies}
          placeholder={planText.pass.allergiesPlaceholder}
          onChange={(event) => onEdit({ type: "updateMember", id: member.id, changes: { allergies: event.target.value } })}
          className={`${INPUT} mt-2`}
        />
      </div>
    </>
  );
}
