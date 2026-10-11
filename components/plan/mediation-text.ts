import type { Locale } from "@/lib/locale";
import type { Conflict } from "@/lib/mediation";
import type { Messages } from "@/lib/messages";
import { type OptionKey, type PlanDraft, fillTemplate, getMemberName } from "@/lib/plan-draft";

type PlanText = Messages["plan"];
type OptionCopy = { title: string; body: string; cost: string };

// Past this many, a list of names ends in a count.
const MAX_NAMES = 3;

/** The clash as a sentence, for the heading of its screen. */
export function clashTitle(conflict: Conflict, text: PlanText): string {
  if (conflict.kind !== "access") return text.mediation.titles[conflict.kind];
  return fillTemplate(text.mediation.titles.access, { activity: text.interests[conflict.interest] });
}

/** The clash in a word or two, for a list of what was agreed. */
export function clashName(conflict: Conflict, text: PlanText): string {
  return conflict.kind === "access" ? text.interests[conflict.interest] : text.mediation.summary[conflict.kind];
}

/** What an option is called, what happens under it, and what it costs. */
export function optionCopy(conflict: Conflict, key: OptionKey, text: PlanText): OptionCopy {
  const options = text.mediation.options;
  if (conflict.kind === "access") {
    if (key === "split") return options.access.split;
    if (key === "swap") return options.access.swap;
    return { ...options.access.adapt, body: text.mediation.adaptBody[conflict.interest] };
  }
  if (conflict.kind === "pace") {
    if (key === "split") return options.pace.split;
    return key === "slow" ? options.pace.slow : options.pace.breaks;
  }
  if (key === "split") return options.time.split;
  return key === "oneEach" ? options.time.oneEach : options.time.turns;
}

/** "Ibu, Raka, and 3 others": the named members in the order they joined the group. */
export function listNames(memberIds: string[], draft: PlanDraft, text: PlanText, locale: Locale): string {
  const names = draft.members
    .filter((member) => memberIds.includes(member.id))
    .map((member) => getMemberName(member, draft.members, text.ageGroups));
  const shown =
    names.length > MAX_NAMES
      ? [...names.slice(0, MAX_NAMES - 1), fillTemplate(text.mediation.others, { count: names.length - MAX_NAMES + 1 })]
      : names;
  return new Intl.ListFormat(locale, { type: "conjunction" }).format(shown);
}
