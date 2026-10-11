import { type AccessInterest, type Conflict, type MediationOption, settleConflicts } from "@/lib/mediation";
import { isLocale } from "@/lib/locale";
import { type Messages, MESSAGES } from "@/lib/messages";
import { type PlanDraft, getMemberName, parsePlanDraft } from "@/lib/plan-draft";

type Labels = Messages["plan"];

const ADAPTED: Record<AccessInterest, string> = {
  themePark: "a park with step-free routes, plenty of seating, and shows that can be watched sitting down",
  nature: "a spot that needs no hiking: flat paths, a viewing deck, toilets close by",
  shopping: "a calmer shopping area at a quiet hour, with places to sit along the way",
  food: "eateries whose menu suits every stated diet, so everyone eats at one table",
};

// The sentences are English, like the rest of the planner's brief. The names of activities and needs are in the
// trip's own language, so the plan repeats them the way the group reads them.
function instruction(draft: PlanDraft, conflict: Conflict, option: MediationOption, labels: Labels): string {
  const list = new Intl.ListFormat("en", { type: "conjunction" });
  const names = (memberIds: string[]) =>
    list.format(
      draft.members
        .filter((member) => memberIds.includes(member.id))
        .map((member) => getMemberName(member, draft.members, labels.ageGroups)),
    );

  if (conflict.kind === "access") {
    const activity = labels.interests[conflict.interest];
    const wishers = names(conflict.wishers.map((wisher) => wisher.memberId));
    const strained = conflict.strained
      .map((entry) => `${names([entry.memberId])} (${entry.needs.map((need) => labels.needs[need]).join(", ")})`)
      .join("; ");
    const clash = `${activity}: wanted by ${wishers}; hard on ${strained}.`;
    if (option.key === "split") {
      return `${clash} Agreed: for one block of about 3 hours the group splits: those who want it (${wishers}) go, while the others spend that time at a calm, accessible place nearby with an adult for company. Everyone meets again for the next meal. Describe both halves in that stop's detail.`;
    }
    if (option.key === "swap") {
      return `${clash} Agreed: leave it out of the plan. In its place, plan something every member can join comfortably.`;
    }
    return `${clash} Agreed: go together to a version everyone can join. Choose ${ADAPTED[conflict.interest]}, and keep the visit to about 3 hours.`;
  }

  if (conflict.kind === "pace") {
    const resting = names(conflict.resting.map((entry) => entry.memberId));
    const clash = `${labels.mediation.summary.pace}: the trip is set to packed, but rest is needed by ${resting}.`;
    if (option.key === "split") {
      return `${clash} Agreed: around midday ${resting} go back to the lodging to rest, with company, while the others fit in one more stop. Everyone meets again for dinner. Describe both halves in the detail.`;
    }
    if (option.key === "slow") {
      return `${clash} Agreed: plan the whole trip at a relaxed pace instead, 2 to 3 stops a day with ample rest.`;
    }
    return `${clash} Agreed: keep the packed pace, but give every day a fixed rest block of about 90 minutes around midday for the whole group, at the lodging or a calm café.`;
  }

  const wishes = conflict.wishes
    .map((wish) => `${wish.interest ? labels.interests[wish.interest] : wish.label} (${names(wish.memberIds)})`)
    .join("; ");
  const clash = `${labels.mediation.summary.time}: ${conflict.wishes.length} must-have wishes compete for about ${conflict.slots} slots: ${wishes}.`;
  if (option.key === "split") {
    return `${clash} Agreed: for half a day the group splits into smaller groups by wish, each with an adult, then meets again. Describe each group's stop in the detail.`;
  }
  if (option.key === "oneEach") {
    return `${clash} Agreed: first give each person one of their must-have wishes. Fit the others in only if time is left.`;
  }
  return `${clash} Agreed: give every one of these wishes its own slot, each shorter than usual, so all of them fit.`;
}

/**
 * What the group agreed on where its wishes clashed, written as instructions for the planner. Empty when nothing
 * clashes. A clash the group did not settle themselves is given its fairest option.
 */
export function mediationBrief(rawDraft: unknown, locale: unknown): string {
  const draft = parsePlanDraft(rawDraft);
  if (!draft) return "";
  const settled = settleConflicts(draft);
  if (settled.length === 0) return "";
  const labels = MESSAGES[isLocale(locale) ? locale : "id"].plan;
  const lines = settled.map(
    ({ conflict, option }, index) => `${index + 1}. ${instruction(draft, conflict, option, labels)}`,
  );
  return `\n\nGROUP AGREEMENTS (FAIR MEDIATION): the members' wishes clashed, and the group settled each clash as written below. Follow every agreement exactly. A member's stated need is never traded away; only wishes are. In the "detail" of each stop an agreement shapes, say in one plain sentence what the group agreed, for example who goes where and when everyone meets again. Write that sentence in the output language and in your own words; never copy wording or labels from this list.\n${lines.join("\n")}`;
}
