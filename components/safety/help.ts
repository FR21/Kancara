import type { Messages } from "@/lib/messages";
import { type AgeGroup, fillTemplate } from "@/lib/plan-draft";
import type { SafetyAction } from "@/lib/safety/action";
import type { SafetyMember, SafetyPack } from "@/lib/safety/pack";
import { meetingPlace } from "@/lib/safety/plan-position";

/** How an action ended: sent, kept for later, or why not. */
export type ActOutcome = "done" | "queued" | "offline" | "taken" | "invalid" | "failed";
export type Clock = { date: string; time: string };

/** What every part of the help page reads: the pack, the words, the clock, and the one way to change anything. */
export type HelpContext = {
  pack: SafetyPack;
  text: Messages["safety"];
  ageLabels: Record<AgeGroup, string>;
  clock: Clock | null;
  online: boolean;
  /** The site's own address, which every link handed to a member starts with. */
  origin: string;
  act: (action: SafetyAction) => Promise<ActOutcome>;
};

type Named = { name: string; ageGroup: AgeGroup };

/** A member's name, or "Adult 2" for one who was never named. */
export function displayName(member: Named, members: Named[], ageLabels: Record<AgeGroup, string>): string {
  const name = member.name.trim();
  if (name) return name;
  const unnamed = members.filter((entry) => entry.ageGroup === member.ageGroup && entry.name.trim() === "");
  return `${ageLabels[member.ageGroup]} ${unnamed.indexOf(member) + 1}`;
}

export function nameIn(context: HelpContext, member: SafetyMember): string {
  return displayName(member, context.pack.members, context.ageLabels);
}

/** A member's own link: the help page as them, with no account. Empty when the holder may not pass it on. */
export function helpLink(context: HelpContext, member: SafetyMember): string {
  return member.helpToken ? `${context.origin}/h/${member.helpToken}` : "";
}

/** The message a chat or a text to a missing member opens with: where the group waits, and their own link to the way back. */
export function searchMessage(context: HelpContext, member: SafetyMember): string {
  const copy = context.text.search;
  const place = context.clock ? meetingPlace(context.pack, context.clock) : context.pack.meetingPoint;
  const waiting = place ? fillTemplate(copy.message, { place: place.label }) : copy.messageNoPlace;
  const link = helpLink(context, member);
  return member.joined || !link ? waiting : `${waiting} ${fillTemplate(copy.messageLink, { link })}`;
}
