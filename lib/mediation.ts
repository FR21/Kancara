import {
  type Agreements,
  type InterestKey,
  type Member,
  type NeedKey,
  type OptionKey,
  type Pace,
  type PlanDraft,
  type WishLevel,
  INTEREST_KEYS,
  listTripDates,
  sameText,
} from "./plan-draft";

// Fair mediation: where the group's wishes pull against each other, the planner does not pick a winner by head
// count. Each clash is named, with a few ways to settle it and who gives something up under each one. Two rules
// hold everywhere: a stated need is never traded away, only wishes are; and no single person should be the one
// who gives way every time.

/** How much someone gives up under an option: part of a wish, or all of it. */
export type Share = "part" | "all";

/** One way to settle a clash. Members missing from `gives` give up nothing. */
export type MediationOption = {
  key: OptionKey;
  gives: Record<string, Share>;
  /** The group is not together for a while. */
  apart: boolean;
};

export type Wisher = { memberId: string; level: WishLevel };
export type Strained = { memberId: string; needs: NeedKey[] };
/** A must-have wish competing for time. `interest` is null for one typed by hand, which `label` then names. */
export type TimeWish = { key: string; interest: InterestKey | null; label: string; memberIds: string[] };

type ConflictBase = { id: string; options: MediationOption[] };
/** Some want an activity that is hard on what others need. */
export type AccessConflict = ConflictBase & { kind: "access"; interest: AccessInterest; wishers: Wisher[]; strained: Strained[] };
/** The trip is set to a packed pace while some need rest. */
export type PaceConflict = ConflictBase & { kind: "pace"; resting: Strained[]; others: string[] };
/** More must-have wishes than the days have room for. */
export type TimeConflict = ConflictBase & { kind: "time"; wishes: TimeWish[]; slots: number };
export type Conflict = AccessConflict | PaceConflict | TimeConflict;

export type Tally = { part: number; all: number };

// The needs each kind of activity is usually hard on. Museums are left out: they are seated, quiet, and step-free
// often enough that naming a clash there would be a false alarm.
const ACCESS_INTERESTS = ["themePark", "nature", "shopping", "food"] as const satisfies readonly InterestKey[];
export type AccessInterest = (typeof ACCESS_INTERESTS)[number];

const STRAINS: Record<AccessInterest, NeedKey[]> = {
  themePark: ["wheelchair", "shortWalks", "quiet", "noCrowds", "nap"],
  nature: ["wheelchair", "noStairs", "shortWalks", "nearToilet"],
  shopping: ["shortWalks", "quiet", "noCrowds"],
  food: ["halal", "vegetarian", "vegan"],
};

const REST_NEEDS: NeedKey[] = ["nap", "frequentBreaks", "shortWalks"];

// How many wished-for activities a day has room for, beside meals and getting around.
const WISHES_PER_DAY: Record<Pace, number> = { relaxed: 2, packed: 4 };

// Splitting up leaves nobody alone only from three people.
const MIN_TO_SPLIT = 3;
const MAX_TRIP_DAYS = 60;

// Giving up part of a wish counts one, all of it two. From three on, the same person keeps being the one who gives way.
const PART_POINTS = 1;
const ALL_POINTS = 2;
const OVERBURDENED_POINTS = 3;

const SPLIT: MediationOption = { key: "split", gives: {}, apart: true };

function sharesFor(memberIds: string[], share: Share): Record<string, Share> {
  return Object.fromEntries(memberIds.map((memberId) => [memberId, share]));
}

function accessConflict(interest: AccessInterest, members: Member[], canSplit: boolean): AccessConflict | null {
  const strains = STRAINS[interest];
  const wishers = members.flatMap((member): Wisher[] => {
    const level = member.interests[interest];
    return level ? [{ memberId: member.id, level }] : [];
  });
  const musts = wishers.filter((wisher) => wisher.level === "must").map((wisher) => wisher.memberId);
  const nices = wishers.filter((wisher) => wisher.level === "nice").map((wisher) => wisher.memberId);
  // Someone who wants the activity despite their own need is asking for a version that suits them, not clashing.
  const strained = members
    .filter((member) => member.interests[interest] === undefined)
    .flatMap((member): Strained[] => {
      const needs = member.needs.filter((need) => strains.includes(need));
      return needs.length > 0 ? [{ memberId: member.id, needs }] : [];
    });
  // A wish nobody holds strongly is simply planned in its gentle form; there is nothing to settle.
  if (musts.length === 0 || strained.length === 0) return null;

  const options: MediationOption[] = [{ key: "adapt", gives: sharesFor(musts, "part"), apart: false }];
  if (canSplit) options.push(SPLIT);
  options.push({ key: "swap", gives: { ...sharesFor(musts, "all"), ...sharesFor(nices, "part") }, apart: false });
  return { id: `access:${interest}`, kind: "access", interest, wishers, strained, options };
}

function paceConflict(draft: PlanDraft, canSplit: boolean): PaceConflict | null {
  if (draft.pace !== "packed") return null;
  const resting = draft.members.flatMap((member): Strained[] => {
    const needs = member.needs.filter((need) => REST_NEEDS.includes(need));
    return needs.length > 0 ? [{ memberId: member.id, needs }] : [];
  });
  const restingIds = resting.map((entry) => entry.memberId);
  const others = draft.members.filter((member) => !restingIds.includes(member.id)).map((member) => member.id);
  if (resting.length === 0 || others.length === 0) return null;

  const options: MediationOption[] = [{ key: "breaks", gives: sharesFor(others, "part"), apart: false }];
  if (canSplit) options.push(SPLIT);
  options.push({ key: "slow", gives: sharesFor(others, "all"), apart: false });
  return { id: "pace", kind: "pace", resting, others, options };
}

function listMustWishes(members: Member[]): TimeWish[] {
  const wishes: TimeWish[] = INTEREST_KEYS.map((interest) => ({
    key: interest,
    interest,
    label: "",
    memberIds: members.filter((member) => member.interests[interest] === "must").map((member) => member.id),
  }));
  members.forEach((member) => {
    member.customInterests
      .filter((wish) => wish.level === "must")
      .forEach((wish) => {
        const known = wishes.find((entry) => entry.interest === null && sameText(entry.label, wish.label));
        if (known) {
          known.memberIds.push(member.id);
          return;
        }
        wishes.push({ key: `custom:${wish.label.toLowerCase()}`, interest: null, label: wish.label, memberIds: [member.id] });
      });
  });
  return wishes.filter((wish) => wish.memberIds.length > 0);
}

function timeConflict(draft: PlanDraft, canSplit: boolean): TimeConflict | null {
  const wishes = listMustWishes(draft.members);
  const days = Math.max(1, listTripDates(draft, MAX_TRIP_DAYS).length);
  const slots = days * WISHES_PER_DAY[draft.pace ?? "relaxed"];
  const holders = [...new Set(wishes.flatMap((wish) => wish.memberIds))];
  // One person with a long list is a matter of their own priorities, not a clash between people.
  if (wishes.length <= slots || holders.length < 2) return null;

  const withSeveral = holders.filter(
    (memberId) => wishes.filter((wish) => wish.memberIds.includes(memberId)).length > 1,
  );
  const options: MediationOption[] = [{ key: "turns", gives: sharesFor(holders, "part"), apart: false }];
  // "One each" only helps when it fits: one slot per person, and someone who was asking for more than one.
  if (holders.length <= slots && withSeveral.length > 0) {
    options.push({ key: "oneEach", gives: sharesFor(withSeveral, "part"), apart: false });
  }
  if (canSplit) options.push(SPLIT);
  return { id: "time", kind: "time", wishes, slots, options };
}

/** Every place where the group's wishes clash, each with the ways it can be settled. */
export function findConflicts(draft: PlanDraft): Conflict[] {
  const canSplit = draft.members.length >= MIN_TO_SPLIT;
  const conflicts: Conflict[] = ACCESS_INTERESTS.flatMap(
    (interest) => accessConflict(interest, draft.members, canSplit) ?? [],
  );
  const time = timeConflict(draft, canSplit);
  if (time) conflicts.push(time);
  const pace = paceConflict(draft, canSplit);
  if (pace) conflicts.push(pace);
  return conflicts;
}

/** The option picked for a clash, or null when none is or the pick no longer exists for it. */
export function chosenOption(conflict: Conflict, agreements: Agreements): MediationOption | null {
  return conflict.options.find((option) => option.key === agreements[conflict.id]) ?? null;
}

export function countSettled(conflicts: Conflict[], agreements: Agreements): number {
  return conflicts.filter((conflict) => chosenOption(conflict, agreements) !== null).length;
}

/** How often each member gives something up across the picks made so far. Members who never do are absent. */
export function tallyGives(conflicts: Conflict[], agreements: Agreements): Map<string, Tally> {
  const tallies = new Map<string, Tally>();
  conflicts.forEach((conflict) => {
    const option = chosenOption(conflict, agreements);
    if (!option) return;
    Object.entries(option.gives).forEach(([memberId, share]) => {
      const tally = tallies.get(memberId) ?? { part: 0, all: 0 };
      tallies.set(memberId, { ...tally, [share]: tally[share] + 1 });
    });
  });
  return tallies;
}

function givePoints(tally: Tally): number {
  return tally.part * PART_POINTS + tally.all * ALL_POINTS;
}

/** True when this member keeps being the one who gives way. */
export function isOverburdened(tally: Tally | undefined): boolean {
  return tally !== undefined && givePoints(tally) >= OVERBURDENED_POINTS;
}

// Lower is fairer, compared entry by entry: nobody always giving way matters most, then keeping the group
// together, then how much the most burdened person gives, then how much is given up in total.
function unfairness(conflicts: Conflict[], agreements: Agreements): number[] {
  const tallies = [...tallyGives(conflicts, agreements).values()];
  const points = tallies.map(givePoints);
  return [
    tallies.filter(isOverburdened).length,
    conflicts.filter((conflict) => chosenOption(conflict, agreements)?.apart).length,
    Math.max(0, ...points),
    points.reduce((sum, value) => sum + value, 0),
  ];
}

function isFairer(candidate: number[], best: number[]): boolean {
  const index = candidate.findIndex((value, position) => value !== best[position]);
  return index >= 0 && candidate[index] < best[index];
}

/**
 * The fairest pick for every clash taken together. Picks in `fixed` are kept, so a suggestion answers what the
 * group already chose elsewhere. Each clash has at most three options and a group has at most six clashes, so
 * every combination is tried; among equals the first option of each clash wins.
 */
export function suggestAgreements(conflicts: Conflict[], fixed: Agreements = {}): Agreements {
  let best: Agreements = {};
  let bestScore: number[] | null = null;
  const tryFrom = (index: number, picked: Agreements) => {
    if (index === conflicts.length) {
      const score = unfairness(conflicts, picked);
      if (bestScore === null || isFairer(score, bestScore)) {
        best = picked;
        bestScore = score;
      }
      return;
    }
    const conflict = conflicts[index];
    const kept = chosenOption(conflict, fixed);
    (kept ? [kept] : conflict.options).forEach((option) => tryFrom(index + 1, { ...picked, [conflict.id]: option.key }));
  };
  tryFrom(0, {});
  return best;
}

/** Every clash with the option that settles it: the group's pick, or the fairest one where they made none. */
export function settleConflicts(draft: PlanDraft): { conflict: Conflict; option: MediationOption }[] {
  const conflicts = findConflicts(draft);
  const suggested = suggestAgreements(conflicts, draft.agreements);
  return conflicts.flatMap((conflict) => {
    const option = chosenOption(conflict, draft.agreements) ?? chosenOption(conflict, suggested);
    return option ? [{ conflict, option }] : [];
  });
}
