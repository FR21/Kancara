"use client";

import { Trash2 } from "lucide-react";
import { type Dispatch, useState } from "react";
import type { Messages } from "@/lib/messages";
import {
  type AgeGroup,
  type Member,
  type PlanDraft,
  type PlanDraftAction,
  AGE_GROUPS,
  carriesPhoneByDefault,
  fillTemplate,
  getMemberName,
  MAX_AGE,
} from "@/lib/plan-draft";
import { MAX_PHONE_CHARS, normalizePhone } from "@/lib/safety/contact";
import MemberNeedsFields from "@/components/members/MemberNeedsFields";
import MemberWishesFields from "@/components/members/MemberWishesFields";
import { FORM_GROUP, FORM_GROUPS } from "@/components/members/form-groups";
import SegmentedToggle from "@/components/ui/SegmentedToggle";
import SelectField from "@/components/ui/SelectField";
import { buttonClass, FIELD_LABEL, INPUT, FIELD_HINT_TYPE, FIELD_HINT } from "@/components/ui/styles";

type MemberEditorProps = {
  member: Member;
  draft: PlanDraft;
  dispatch: Dispatch<PlanDraftAction>;
  text: Messages["plan"];
  onRemoved: () => void;
};

const MAX_NAME_CHARS = 40;
const PHONE_CHOICES = ["yes", "no"] as const;

export default function MemberEditor({ member, draft, dispatch, text, onRemoved }: MemberEditorProps) {
  const displayName = getMemberName(member, draft.members, text.ageGroups);
  const carriesPhone = member.carriesPhone ?? carriesPhoneByDefault(member.ageGroup);
  // A number is judged once the field is left, not while it is still being typed.
  const [phoneChecked, setPhoneChecked] = useState(false);
  // Removing someone takes a second tap, as on the crew grid: the button sits just above the step's Back.
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const phone = member.phone ?? "";
  const phoneInvalid = phoneChecked && phone.trim() !== "" && normalizePhone(phone) === null;

  const removeMember = () => {
    dispatch({ type: "removeMember", id: member.id });
    onRemoved();
  };

  const setAge = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 3);
    dispatch({ type: "setMemberAge", id: member.id, age: digits ? Math.min(Number(digits), MAX_AGE) : null });
  };

  return (
    <div className={FORM_GROUPS}>
      <div className={FORM_GROUP}>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`member-${member.id}-age-group`} className={`${FIELD_LABEL} block`}>
              {text.pass.ageGroup}
            </label>
            <SelectField
              id={`member-${member.id}-age-group`}
              value={member.ageGroup}
              onChange={(event) =>
                dispatch({
                  type: "updateMember",
                  id: member.id,
                  changes: { ageGroup: event.target.value as AgeGroup },
                })
              }
              className="mt-2"
            >
              {AGE_GROUPS.map((ageGroup) => (
                <option key={ageGroup} value={ageGroup}>
                  {text.ageGroups[ageGroup]}
                </option>
              ))}
            </SelectField>
          </div>

          <div>
            <label htmlFor={`member-${member.id}-age`} className={`${FIELD_LABEL} block`}>
              {text.pass.age}
            </label>
            <input
              id={`member-${member.id}-age`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={member.age ?? ""}
              placeholder={text.pass.agePlaceholder}
              aria-describedby={`member-${member.id}-age-hint`}
              onChange={(event) => setAge(event.target.value)}
              className={`${INPUT} mt-2 tabular-nums`}
            />
            <p id={`member-${member.id}-age-hint`} className="mt-2 text-caption text-text-muted">
              {text.pass.ageHint}
            </p>
          </div>
        </div>
      </div>

      <div className={FORM_GROUP}>
        <MemberNeedsFields id="member" member={member} planText={text} onEdit={dispatch} />
      </div>

      <div className={FORM_GROUP}>
        <MemberWishesFields id="member" member={member} planText={text} onEdit={dispatch} />
      </div>

      <div className={FORM_GROUP}>
        <div>
          <p aria-hidden="true" className={FIELD_LABEL}>
            {text.pass.carriesPhone}
          </p>
          <SegmentedToggle
            name="member-carries-phone"
            label={text.pass.carriesPhone}
            options={PHONE_CHOICES}
            labels={{ yes: text.pass.carriesYes, no: text.pass.carriesNo }}
            value={carriesPhone ? "yes" : "no"}
            onChange={(choice) => dispatch({ type: "updateMember", id: member.id, changes: { carriesPhone: choice === "yes" } })}
            className="mt-2"
          />
          {!carriesPhone && (
            <p className={FIELD_HINT}>{fillTemplate(text.pass.noPhoneHint, { name: displayName })}</p>
          )}
        </div>

        {carriesPhone && (
          <div>
            <label htmlFor="member-phone" className={FIELD_LABEL}>
              {text.pass.phone}
            </label>
            <input
              id="member-phone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              maxLength={MAX_PHONE_CHARS}
              value={phone}
              placeholder="+62 812 3456 7890"
              aria-describedby="member-phone-hint"
              aria-invalid={phoneInvalid}
              onChange={(event) => {
                setPhoneChecked(false);
                dispatch({ type: "updateMember", id: member.id, changes: { phone: event.target.value } });
              }}
              onBlur={() => setPhoneChecked(true)}
              className={`${INPUT} mt-2 tabular-nums`}
            />
            <p id="member-phone-hint" className={`${FIELD_HINT_TYPE} ${phoneInvalid ? "text-error" : "text-text-muted"}`}>
              {phoneInvalid ? text.pass.phoneInvalid : text.pass.phoneHint}
            </p>
          </div>
        )}
      </div>

      <div className={FORM_GROUP}>
        <button
          type="button"
          aria-label={confirmingRemove ? fillTemplate(text.crew.removeConfirmLabel, { name: displayName }) : undefined}
          onClick={() => (confirmingRemove ? removeMember() : setConfirmingRemove(true))}
          onBlur={() => setConfirmingRemove(false)}
          className={buttonClass(confirmingRemove ? "danger" : "outlineDanger", "small")}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {confirmingRemove ? text.crew.removeConfirm : fillTemplate(text.pass.removeMember, { name: displayName })}
        </button>
      </div>
    </div>
  );
}
