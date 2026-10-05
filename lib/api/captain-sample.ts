import { MESSAGES } from "@/lib/messages";
import {
  type AgeGroup,
  type DraftPatch,
  type Member,
  type NeedKey,
  type Pace,
  type PlanDraft,
  createMember,
  fillTemplate,
  listTripDates,
  NEED_CATEGORIES,
  parseLocalDate,
  planDraftReducer,
} from "@/lib/plan-draft";
import { type QuestionKey, nextRequired } from "@/lib/plan-questions";
import type { CaptainClient, ItineraryCover, ItineraryItem } from "./captain";
import { findDateRange } from "./sample-dates";

const MAX_SAMPLE_DAYS = 7;
const CITY = "[A-Z][\\p{L}'-]+(?:\\s[A-Z][\\p{L}'-]+)?";
const JOINER_WORD = "(?:lalu|kemudian|then|dan|and)\\s+";
const CITY_JOINER = `(?:\\s*,\\s*(?:${JOINER_WORD})?|\\s+${JOINER_WORD})(?:(?:ke|to)\\s+)?`;

const ORIGIN_PATTERN = new RegExp(`\\b(?:[Dd]ari|[Ff]rom)\\s+(${CITY})`, "u");
const DESTINATION_PATTERN = new RegExp(`\\b(?:[Kk]e|[Tt]o)\\s+(${CITY}(?:${CITY_JOINER}${CITY})*)`, "u");
const JOINER_PATTERN = new RegExp(CITY_JOINER, "u");
const BARE_SPLIT_PATTERN = /\s*(?:,|\blalu\b|\bkemudian\b|\bthen\b|\bdan\b|\band\b)\s*/i;
const MAX_BARE_WORDS = 3;
const MIN_PLAIN_BUDGET = 100_000;
const KINSHIP_PATTERN = /\b(nenek|kakek|grandma|grandpa|grandmother|grandfather)\b/i;

const AGE_KEYWORDS: { ageGroup: AgeGroup; pattern: RegExp }[] = [
  { ageGroup: "elderly", pattern: /lansia|elderly|senior/i },
  { ageGroup: "toddler", pattern: /balita|bayi|toddler|baby|infant/i },
  { ageGroup: "child", pattern: /\banak\b|children|\bkids?\b|\bchild\b/i },
];

const SHARED_NEEDS: { need: NeedKey; pattern: RegExp }[] = [
  { need: "halal", pattern: /halal/i },
  { need: "vegetarian", pattern: /vegetari/i },
  { need: "vegan", pattern: /\bvegan\b/i },
];

const MOBILITY_NEEDS: { need: NeedKey; pattern: RegExp }[] = [
  { need: "wheelchair", pattern: /kursi roda|wheelchair/i },
  { need: "noStairs", pattern: /naik tangga|stairs/i },
  { need: "shortWalks", pattern: /jalan jauh|walk far|walk long/i },
];

const MEAL_NEEDS: NeedKey[] = [...NEED_CATEGORIES.diet];
const WALK_NEEDS: NeedKey[] = [...NEED_CATEGORIES.mobility, ...NEED_CATEGORIES.other];
const REST_NEEDS: NeedKey[] = [...NEED_CATEGORIES.rest];
const QUIET_NEEDS: NeedKey[] = [...NEED_CATEGORIES.sensory];

type SlotKey = "arrive" | "morning" | "lunch" | "rest" | "afternoon" | "dinner" | "evening" | "depart";

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function findBudget(story: string): number | undefined {
  const scaled = story.match(/(\d+(?:[.,]\d+)?)\s*(?:juta|jt|million)\b/i);
  if (scaled) return Math.round(parseFloat(scaled[1].replace(",", ".")) * 1_000_000);
  const plain = story.match(/(?:rp\.?|idr)\s*(\d[\d.,]{3,})/i);
  if (plain) return Number(plain[1].replace(/[.,]/g, ""));
  return undefined;
}

function findPace(story: string): Pace | undefined {
  if (/santai|relaxed|slow pace/i.test(story)) return "relaxed";
  if (/padat|packed|full schedule/i.test(story)) return "packed";
  return undefined;
}

function findGroupSize(story: string): number | undefined {
  if (/\bsolo\b|sendirian|\balone\b/i.test(story)) return 1;
  const match = story.match(/(\d+)\s*(?:orang|people|persons?|pax)|family of\s*(\d+)/i);
  if (!match) return undefined;
  return Number(match[1] ?? match[2]);
}

function addNeed(member: Member, need: NeedKey): Member {
  return member.needs.includes(need) ? member : { ...member, needs: [...member.needs, need] };
}

function readMembers(story: string, existing: Member[]): Member[] | undefined {
  const groupSize = findGroupSize(story);
  let members = [...existing];
  let changed = false;

  const kinship = story.match(KINSHIP_PATTERN);
  if (kinship) {
    const name = capitalize(kinship[1]);
    if (!members.some((member) => member.name === name)) {
      members.push(createMember("elderly", name));
      changed = true;
    }
  }

  AGE_KEYWORDS.forEach(({ ageGroup, pattern }) => {
    if (!pattern.test(story) || members.some((member) => member.ageGroup === ageGroup)) return;
    members.push(createMember(ageGroup));
    changed = true;
  });

  while (groupSize !== undefined && members.length < groupSize) {
    members.push(createMember("adult"));
    changed = true;
  }

  SHARED_NEEDS.forEach(({ need, pattern }) => {
    if (!pattern.test(story) || members.length === 0) return;
    members = members.map((member) => addNeed(member, need));
    changed = true;
  });

  MOBILITY_NEEDS.forEach(({ need, pattern }) => {
    if (!pattern.test(story) || members.length === 0) return;
    const target = members.find((member) => member.ageGroup === "elderly") ?? members[0];
    members = members.map((member) => (member.id === target.id ? addNeed(member, need) : member));
    changed = true;
  });

  return changed ? members : undefined;
}

function titleCase(value: string): string {
  return value.trim().split(/\s+/).map(capitalize).join(" ");
}

function readBareCities(story: string): string[] {
  return story
    .replace(/[.!?]+$/, "")
    .split(BARE_SPLIT_PATTERN)
    .map((part) => part.trim())
    .filter((part) => /^[\p{L}' -]+$/u.test(part) && part.split(/\s+/).length <= MAX_BARE_WORDS)
    .map(titleCase);
}

function readFocused(story: string, focus: QuestionKey | null, draft: PlanDraft, patch: DraftPatch): void {
  const bareNumber = story.trim().match(/^(\d[\d.,]*)$/);
  if (focus === "origin" && patch.origin === undefined) {
    const cities = readBareCities(story);
    if (cities.length > 0) patch.origin = cities[0];
  }
  if (focus === "destination" && patch.destinations === undefined) {
    const cities = readBareCities(story);
    if (cities.length > 0) patch.destinations = cities;
  }
  if (focus === "crew" && patch.members === undefined && bareNumber) {
    const size = Number(bareNumber[1]);
    const members = [...draft.members];
    while (members.length < size) members.push(createMember("adult"));
    if (members.length > draft.members.length) patch.members = members;
  }
  if (focus === "budget" && patch.budget === undefined && bareNumber) {
    const amount = Number(bareNumber[1].replace(/[.,]/g, ""));
    if (amount >= MIN_PLAIN_BUDGET) patch.budget = amount;
  }
}

function readStory(story: string, draft: PlanDraft, focus: QuestionKey | null): DraftPatch {
  const patch: DraftPatch = {};
  const dates = findDateRange(story, new Date());
  if (dates && dates.endDate >= dates.startDate) {
    patch.startDate = dates.startDate;
    patch.endDate = dates.endDate;
  }
  const origin = story.match(ORIGIN_PATTERN);
  if (origin) patch.origin = origin[1];
  const destinations = story.match(DESTINATION_PATTERN);
  if (destinations) patch.destinations = destinations[1].split(JOINER_PATTERN).filter(Boolean);
  const members = readMembers(story, draft.members);
  if (members) patch.members = members;
  const budget = findBudget(story);
  if (budget !== undefined) patch.budget = budget;
  const pace = findPace(story);
  if (pace) patch.pace = pace;
  readFocused(story, focus, draft, patch);
  return patch;
}

export const sampleCaptain: CaptainClient = {
  async reply({ story, draft, locale, focus }, signal) {
    await wait(900, signal);
    const text = MESSAGES[locale].plan;
    const phrases = text.sample;
    const draftPatch = readStory(story, draft, focus);
    const nextDraft = planDraftReducer(draft, { type: "patch", patch: draftPatch });
    const dateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
    const money = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "IDR",
      notation: "compact",
      maximumFractionDigits: 1,
    });

    const captured: string[] = [];
    if (draftPatch.origin && draftPatch.destinations) {
      const route = [draftPatch.origin, ...draftPatch.destinations].join(" → ");
      captured.push(fillTemplate(phrases.itemRoute, { value: route }));
    } else if (draftPatch.destinations) {
      captured.push(fillTemplate(phrases.itemDestination, { value: draftPatch.destinations.join(", ") }));
    } else if (draftPatch.origin) {
      captured.push(fillTemplate(phrases.itemOrigin, { value: draftPatch.origin }));
    }
    if (draftPatch.startDate && draftPatch.endDate) {
      const range = dateFormat.formatRange(parseLocalDate(draftPatch.startDate), parseLocalDate(draftPatch.endDate));
      captured.push(fillTemplate(phrases.itemDates, { value: range }));
    }
    if (draftPatch.members) {
      captured.push(fillTemplate(phrases.itemGroup, { value: draftPatch.members.length }));
    }
    if (draftPatch.budget !== undefined) {
      captured.push(fillTemplate(phrases.itemBudget, { value: money.format(draftPatch.budget) }));
    }
    if (draftPatch.pace) {
      captured.push(fillTemplate(phrases.itemPace, { value: text.paces[draftPatch.pace].toLowerCase() }));
    }

    const listFormat = new Intl.ListFormat(locale, { style: "long", type: "conjunction" });
    const opening =
      captured.length > 0
        ? fillTemplate(phrases.captured, { items: listFormat.format(captured) })
        : phrases.nothing;
    const next = nextRequired(nextDraft);
    const closing = next ? text.deck.questions[next].title : text.chat.allSet;
    return { message: `${opening} ${closing}`, draftPatch };
  },

  async itinerary({ draft, locale }, signal) {
    await wait(1400, signal);
    const templates = MESSAGES[locale].plan.sample.itinerary;
    const dates = listTripDates(draft, MAX_SAMPLE_DAYS);
    const names = { origin: draft.origin.trim(), destination: draft.destinations[0] ?? "" };
    const someoneNeeds = (needs: NeedKey[]) =>
      draft.members.some((member) => needs.some((need) => member.needs.includes(need)));
    const needsRest = someoneNeeds(REST_NEEDS) || draft.pace === "relaxed";

    const buildItem = (time: string, slot: SlotKey, related: NeedKey[]): ItineraryItem => {
      const covers = related.flatMap((need): ItineraryCover[] => {
        const memberIds = draft.members
          .filter((member) => member.needs.includes(need))
          .map((member) => member.id);
        return memberIds.length > 0 ? [{ need, memberIds }] : [];
      });
      const notes = covers.map((cover) => templates.notes[cover.need]).join(" ");
      return {
        time,
        title: fillTemplate(templates[slot].title, names),
        detail: notes || templates[slot].detail,
        covers,
      };
    };

    const days = dates.map((date, index) => {
      const isFirst = index === 0;
      const isLast = index === dates.length - 1 && dates.length > 1;
      const opening = isFirst
        ? buildItem(draft.extras.arrivalTime || "10:00", "arrive", WALK_NEEDS)
        : buildItem(draft.extras.dayStart || "09:00", "morning", [...WALK_NEEDS, ...QUIET_NEEDS]);
      const items = [opening, buildItem("12:00", "lunch", MEAL_NEEDS)];
      if (isLast) {
        items.push(buildItem(draft.extras.departureTime || "15:00", "depart", WALK_NEEDS));
        return { date, items };
      }
      const midday = needsRest
        ? buildItem("14:00", "rest", REST_NEEDS)
        : buildItem("14:30", "afternoon", WALK_NEEDS);
      items.push(midday, buildItem("18:30", "dinner", MEAL_NEEDS));
      if (draft.pace === "packed") items.push(buildItem("20:00", "evening", QUIET_NEEDS));
      return { date, items };
    });

    return { days };
  },

  async invite(_request, signal) {
    await wait(600, signal);
    const code = Math.random().toString(36).slice(2, 8);
    return { url: `${window.location.origin}/plan?invite=${code}` };
  },
};
