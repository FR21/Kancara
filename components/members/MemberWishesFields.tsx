"use client";

import { Check, X } from "lucide-react";
import CustomAdd from "@/components/plan/CustomAdd";
import Checkbox from "@/components/ui/Checkbox";
import IconButton from "@/components/ui/IconButton";
import SegmentedToggle from "@/components/ui/SegmentedToggle";
import { FIELD_LABEL } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import { type Member, type PlanDraftAction, fillTemplate, INTEREST_KEYS, sameText } from "@/lib/plan-draft";

type MemberWishesFieldsProps = {
  /** Prefixes the ids and names of the fields, so they stay unique on the page. */
  id: string;
  member: Member;
  planText: Messages["plan"];
  onEdit: (action: PlanDraftAction) => void;
};

const WISH_LEVELS = ["nice", "must"] as const;
const WISH_TOGGLE = "mb-2 ml-9 motion-safe:animate-message-in";

/** What a person likes to do on a trip, each with how much they want it, and wishes typed by hand. */
export default function MemberWishesFields({ id, member, planText, onEdit }: MemberWishesFieldsProps) {
  // Typing the name of a listed wish picks that wish instead of adding a twin of it.
  const addWish = (value: string) => {
    const listed = INTEREST_KEYS.find((interest) => sameText(planText.interests[interest], value));
    const typedBefore = member.customInterests.some((wish) => sameText(wish.label, value));
    if (listed && member.interests[listed] === undefined) {
      onEdit({ type: "setMemberInterest", id: member.id, interest: listed, level: "nice" });
    }
    if (!listed && !typedBefore) {
      onEdit({ type: "setMemberCustomInterest", id: member.id, label: value, level: "nice" });
    }
  };

  return (
    <fieldset className="min-w-0">
      <legend className={FIELD_LABEL}>{planText.pass.interestsLegend}</legend>
      <ul className="mt-2 divide-y divide-border">
        {INTEREST_KEYS.map((interest) => {
          const level = member.interests[interest];
          return (
            <li key={interest} className="py-1">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-body-sm text-text">
                <Checkbox
                  checked={level !== undefined}
                  onChange={(checked) =>
                    onEdit({ type: "setMemberInterest", id: member.id, interest, level: checked ? "nice" : null })
                  }
                />
                {planText.interests[interest]}
              </label>
              {level !== undefined && (
                <SegmentedToggle
                  name={`${id}-interest-${interest}`}
                  label={planText.interests[interest]}
                  options={WISH_LEVELS}
                  labels={planText.wishLevels}
                  value={level}
                  className={WISH_TOGGLE}
                  onChange={(option) => onEdit({ type: "setMemberInterest", id: member.id, interest, level: option })}
                />
              )}
            </li>
          );
        })}
        {member.customInterests.map((wish, index) => (
          <li key={wish.label} className="py-1 motion-safe:animate-message-in">
            <div className="flex min-h-11 items-center gap-3 text-body-sm text-text">
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary"
              >
                <Check className="size-4" strokeWidth={3.5} />
              </span>
              <span className="min-w-0 flex-1 wrap-anywhere">{wish.label}</span>
              <IconButton
                label={fillTemplate(planText.custom.remove, { name: wish.label })}
                onClick={() => onEdit({ type: "setMemberCustomInterest", id: member.id, label: wish.label, level: null })}
              >
                <X className="size-5" aria-hidden="true" />
              </IconButton>
            </div>
            <SegmentedToggle
              name={`${id}-interest-custom-${index}`}
              label={wish.label}
              options={WISH_LEVELS}
              labels={planText.wishLevels}
              value={wish.level}
              className={WISH_TOGGLE}
              onChange={(option) =>
                onEdit({ type: "setMemberCustomInterest", id: member.id, label: wish.label, level: option })
              }
            />
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <CustomAdd
          id={`${id}-custom-interest`}
          label={planText.custom.interest}
          placeholder={planText.custom.interestPlaceholder}
          count={member.customInterests.length}
          text={planText.custom}
          onAdd={addWish}
        />
      </div>
    </fieldset>
  );
}
