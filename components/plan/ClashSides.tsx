import type { ReactNode } from "react";
import type { Conflict, Strained } from "@/lib/mediation";
import type { Messages } from "@/lib/messages";
import { type Member, type PlanDraft, getMemberName } from "@/lib/plan-draft";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { NeedChip } from "@/components/ui/NeedChips";

type ClashSidesProps = {
  conflict: Conflict;
  draft: PlanDraft;
  text: Messages["plan"];
};

const SIDE_LABEL = "text-label text-text-muted";

// The people on each side of a clash, shown as the characters the visitor made for them.
export default function ClashSides({ conflict, draft, text }: ClashSidesProps) {
  const sides = text.mediation.sides;
  const find = (memberId: string) => draft.members.find((member) => member.id === memberId);

  const person = (member: Member, detail: ReactNode) => (
    <li key={member.id} className="flex items-start gap-3">
      <MemberAvatar ageGroup={member.ageGroup} variant={draft.members.indexOf(member)} className="size-10" />
      <div className="min-w-0">
        <p className="text-label-lg wrap-anywhere text-text">{getMemberName(member, draft.members, text.ageGroups)}</p>
        {detail}
      </div>
    </li>
  );

  const withNeeds = (entries: Strained[]) =>
    entries.flatMap((entry) => {
      const member = find(entry.memberId);
      if (!member) return [];
      return person(
        member,
        <div className="mt-2 flex flex-wrap gap-2">
          {entry.needs.map((need) => (
            <NeedChip key={need} need={need} text={text} />
          ))}
        </div>,
      );
    });

  if (conflict.kind === "time") {
    return (
      <div>
        <h2 className={SIDE_LABEL}>{sides.wishes}</h2>
        <ul className="mt-2 space-y-3">
          {conflict.wishes.map((wish) => {
            const holders = wish.memberIds.flatMap((memberId) => find(memberId) ?? []);
            return (
              <li key={wish.key} className="flex items-center gap-3">
                <span className="flex shrink-0 -space-x-2">
                  {holders.map((member) => (
                    <MemberAvatar
                      key={member.id}
                      ageGroup={member.ageGroup}
                      variant={draft.members.indexOf(member)}
                      className="size-8 ring-2 ring-background"
                    />
                  ))}
                </span>
                <div className="min-w-0">
                  <p className="text-label-lg wrap-anywhere text-text">
                    {wish.interest ? text.interests[wish.interest] : wish.label}
                  </p>
                  <p className="text-body-sm wrap-anywhere text-text-muted">
                    {holders.map((member) => getMemberName(member, draft.members, text.ageGroups)).join(", ")}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (conflict.kind === "pace") {
    return (
      <div>
        <h2 className={SIDE_LABEL}>{sides.resting}</h2>
        <ul className="mt-2 space-y-3">{withNeeds(conflict.resting)}</ul>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
      <div>
        <h2 className={SIDE_LABEL}>{sides.wants}</h2>
        <ul className="mt-2 space-y-3">
          {conflict.wishers.flatMap((wisher) => {
            const member = find(wisher.memberId);
            if (!member) return [];
            return person(member, <p className="text-body-sm text-text-muted">{text.wishLevels[wisher.level]}</p>);
          })}
        </ul>
      </div>
      <div>
        <h2 className={SIDE_LABEL}>{sides.affected}</h2>
        <ul className="mt-2 space-y-3">{withNeeds(conflict.strained)}</ul>
      </div>
    </div>
  );
}
