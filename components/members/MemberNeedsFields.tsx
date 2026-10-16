"use client";

import CustomAdd, { CustomChip } from "@/components/plan/CustomAdd";
import MultiSelectField from "@/components/ui/MultiSelectField";
import { FIELD_LABEL, INPUT, FIELD_DESCRIPTION } from "@/components/ui/styles";
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

/**
 * A person's needs and their allergies. Planner and saved profiles. The needs are picked from one dropdown, grouped
 * by category; what is picked shows under it as chips that take the need away when tapped, with the ones typed by
 * hand among them. The field to type a need of their own comes after, a row of its own like every other field.
 */
export default function MemberNeedsFields({ id, member, planText, onEdit }: MemberNeedsFieldsProps) {
  // Typing the name of a listed choice picks that choice instead of adding a twin of it.
  const addNeed = (value: string) => {
    const listed = NEED_KEYS.find((need) => sameText(planText.needs[need], value));
    if (!listed) onEdit({ type: "addMemberCustomNeed", id: member.id, value });
    else if (!member.needs.includes(listed)) onEdit({ type: "toggleMemberNeed", id: member.id, need: listed });
  };

  const groups = NEED_CATEGORY_KEYS.map((category) => ({
    label: planText.needCategories[category],
    options: NEED_CATEGORIES[category].map((need) => ({ value: need, label: planText.needs[need] })),
  }));
  const picked = member.needs.length + member.customNeeds.length;
  const removeLabel = (name: string) => fillTemplate(planText.custom.remove, { name });

  return (
    <>
      <div>
        <label htmlFor={`${id}-needs`} className={`${FIELD_LABEL} block`}>
          {planText.pass.needsLegend}
        </label>
        <p id={`${id}-needs-hint`} className={FIELD_DESCRIPTION}>
          {planText.pass.needsHint}
        </p>
        <div className="mt-2">
          <MultiSelectField
            id={`${id}-needs`}
            groups={groups}
            selected={member.needs}
            placeholder={planText.pass.needsPlaceholder}
            summary={(count) => fillTemplate(planText.pass.needsChosen, { count })}
            onToggle={(need) => onEdit({ type: "toggleMemberNeed", id: member.id, need })}
            describedBy={`${id}-needs-hint`}
          />
        </div>
        {picked > 0 && (
          <div role="group" aria-label={planText.pass.needsLegend} className="mt-3 flex flex-wrap gap-2">
            {member.needs.map((need) => (
              <CustomChip
                key={need}
                label={planText.needs[need]}
                removeLabel={removeLabel(planText.needs[need])}
                onRemove={() => onEdit({ type: "toggleMemberNeed", id: member.id, need })}
              />
            ))}
            {member.customNeeds.map((need) => (
              <CustomChip
                key={need}
                label={need}
                removeLabel={removeLabel(need)}
                onRemove={() => onEdit({ type: "removeMemberCustomNeed", id: member.id, value: need })}
              />
            ))}
          </div>
        )}
      </div>

      <CustomAdd
        id={`${id}-custom-need`}
        label={planText.custom.need}
        placeholder={planText.custom.needPlaceholder}
        count={member.customNeeds.length}
        text={planText.custom}
        onAdd={addNeed}
      />

      <div>
        <label htmlFor={`${id}-allergies`} className={`${FIELD_LABEL} block`}>
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
