import { Scale } from "lucide-react";
import { type Conflict, isOverburdened, tallyGives } from "@/lib/mediation";
import type { Messages } from "@/lib/messages";
import { type PlanDraft, fillTemplate, getMemberName } from "@/lib/plan-draft";
import MemberAvatar from "./MemberAvatar";

type GiveLedgerProps = {
  conflicts: Conflict[];
  draft: PlanDraft;
  text: Messages["plan"];
};

const MARK = "size-3 rounded-full motion-safe:animate-pop-in";

// Who has given something up across the picks so far. It is the check against one person giving way every time:
// when that happens the ledger says so and asks for a different pick somewhere.
export default function GiveLedger({ conflicts, draft, text }: GiveLedgerProps) {
  const copy = text.mediation.ledger;
  const tallies = tallyGives(conflicts, draft.agreements);
  // Only people who could be asked to give something up are listed. A need is never on the table.
  const partyIds = new Set(
    conflicts.flatMap((conflict) => conflict.options.flatMap((option) => Object.keys(option.gives))),
  );
  const parties = draft.members.filter((member) => partyIds.has(member.id));
  const overburdened = parties.filter((member) => isOverburdened(tallies.get(member.id)));

  return (
    <section aria-labelledby="give-ledger">
      <h2 id="give-ledger" className="flex items-center gap-2 text-label-lg text-text">
        <Scale className="size-5 shrink-0 text-primary" aria-hidden="true" />
        {copy.title}
      </h2>
      <p className="mt-1 text-body-sm text-text-muted">{copy.hint}</p>

      <ul className="mt-4 space-y-3">
        {parties.map((member) => {
          const tally = tallies.get(member.id) ?? { part: 0, all: 0 };
          const status = [
            tally.all > 0 ? fillTemplate(copy.all, { count: tally.all }) : null,
            tally.part > 0 ? fillTemplate(copy.part, { count: tally.part }) : null,
          ].filter((entry) => entry !== null);
          return (
            <li key={member.id} className="flex items-center gap-3">
              <MemberAvatar ageGroup={member.ageGroup} variant={draft.members.indexOf(member)} className="size-8" />
              <div className="min-w-0 flex-1">
                <p className="text-label wrap-anywhere text-text">
                  {getMemberName(member, draft.members, text.ageGroups)}
                </p>
                <p className="text-caption text-text-muted tabular-nums">
                  {status.length > 0 ? status.join(", ") : copy.none}
                </p>
              </div>
              <span aria-hidden="true" className="flex shrink-0 gap-1">
                {Array.from({ length: tally.all }, (_, position) => (
                  <span key={`all-${position}`} className={`${MARK} bg-primary`} />
                ))}
                {Array.from({ length: tally.part }, (_, position) => (
                  <span
                    key={`part-${position}`}
                    className={`${MARK} border border-primary bg-[linear-gradient(90deg,var(--primary)_50%,transparent_50%)]`}
                  />
                ))}
              </span>
            </li>
          );
        })}
      </ul>

      <div role="status" className="mt-4 space-y-2 empty:hidden">
        {overburdened.map((member) => {
          const tally = tallies.get(member.id);
          return (
            <p
              key={member.id}
              className="flex items-start gap-3 rounded-2xl bg-warning-subtle px-4 py-3 text-body-sm text-on-warning-subtle motion-safe:animate-message-in"
            >
              <Scale className="size-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                {fillTemplate(copy.flag, {
                  name: getMemberName(member, draft.members, text.ageGroups),
                  count: tally ? tally.part + tally.all : 0,
                })}
              </span>
            </p>
          );
        })}
      </div>

      <p className="mt-4 text-caption text-text-muted">{copy.principle}</p>
    </section>
  );
}
