import {
  type AgeGroup,
  type InterestKey,
  type LaundryChoice,
  type Member,
  type NeedKey,
  type PlanDraft,
  type TransportKey,
  listTripDates,
} from "./plan-draft";
import { type Weather, type WeatherDay, isRainy } from "./weather";

// The packing list: what this group needs for this trip, each item with who it is for and why it is there. The
// rules below are fixed, so nothing a member depends on is ever left to chance; Captain only adds to them.

export const ITEM_KEYS = [
  "ids",
  "money",
  "chargers",
  "personalMeds",
  "firstAid",
  "clothes",
  "toiletries",
  "laundryKit",
  "laundryBag",
  "rainGear",
  "dryBag",
  "sunCare",
  "waterBottle",
  "warmLayer",
  "winterWear",
  "diapers",
  "babyFood",
  "babyMeds",
  "spareOutfits",
  "comfortToy",
  "carrier",
  "kidSnacks",
  "kidPlay",
  "contactCard",
  "regularMeds",
  "medNotes",
  "comfortShoes",
  "wheelchairKit",
  "walkingAid",
  "foldingStool",
  "dietSnacks",
  "napKit",
  "earProtection",
  "toiletKit",
  "allergyMeds",
  "allergyCard",
  "drivingLicense",
  "transitCard",
  "outdoorKit",
] as const;
export type ItemKey = (typeof ITEM_KEYS)[number];

export type PackingReason =
  | { kind: "basics" }
  | { kind: "laundry"; choice: LaundryChoice }
  | { kind: "rain"; place: string; date: string; chance: number | null }
  | { kind: "heat"; place: string; date: string; temp: number; typical: boolean }
  | { kind: "cold"; place: string; date: string; temp: number; typical: boolean }
  | { kind: "age"; ageGroup: AgeGroup }
  | { kind: "need"; need: NeedKey }
  | { kind: "allergy"; allergies: string }
  | { kind: "transport"; transport: TransportKey }
  | { kind: "interest"; interest: InterestKey }
  | { kind: "captain"; note: string }
  | { kind: "own" };

export type PackingItem = {
  id: string;
  /** Names a listed item. Null for one Captain or the group wrote, whose words are in `label`. */
  key: ItemKey | null;
  label: string;
  /** Null when the item is for the whole group. */
  memberId: string | null;
  reason: PackingReason;
  /** Something a member depends on: leaving it behind hurts more than an inconvenience. */
  essential: boolean;
  count: number | null;
};

const HOT = 31;
const COOL = 20;
const FREEZING = 8;
export const MAX_TRIP_DAYS = 60;
/** How many changes of clothes a day of travel takes. */
export const OUTFITS_PER_DAY = { min: 2, max: 3 };
// A week of clothes is as much as a bag takes. A longer trip washes along the way, unless the group decides to
// carry it all.
export const MAX_OUTFIT_DAYS = 7;

type Rule = { key: ItemKey; essential?: boolean };

const BY_AGE: Record<AgeGroup, Rule[]> = {
  adult: [],
  elderly: [{ key: "regularMeds", essential: true }, { key: "medNotes", essential: true }, { key: "comfortShoes" }],
  child: [{ key: "kidSnacks" }, { key: "kidPlay" }, { key: "contactCard" }],
  toddler: [
    { key: "diapers", essential: true },
    { key: "babyFood", essential: true },
    { key: "babyMeds", essential: true },
    { key: "spareOutfits" },
    { key: "comfortToy" },
    { key: "carrier" },
  ],
};

const BY_NEED: Record<NeedKey, Rule[]> = {
  wheelchair: [{ key: "wheelchairKit", essential: true }],
  noStairs: [{ key: "walkingAid", essential: true }],
  shortWalks: [{ key: "foldingStool" }, { key: "comfortShoes" }],
  halal: [{ key: "dietSnacks" }],
  vegetarian: [{ key: "dietSnacks" }],
  vegan: [{ key: "dietSnacks" }],
  nap: [{ key: "napKit" }],
  frequentBreaks: [{ key: "foldingStool" }],
  quiet: [{ key: "earProtection" }],
  noCrowds: [{ key: "contactCard" }],
  nearToilet: [{ key: "toiletKit" }],
};

const BY_TRANSPORT: Partial<Record<TransportKey, Rule>> = {
  rental: { key: "drivingLicense", essential: true },
  public: { key: "transitCard" },
};

export function tripDayCount(draft: PlanDraft): number {
  return Math.max(1, listTripDates(draft, MAX_TRIP_DAYS).length);
}

/** True for a trip too long to pack clothes for every day, so the group has to say how it will wash. */
export function needsLaundryChoice(draft: PlanDraft): boolean {
  return tripDayCount(draft) > MAX_OUTFIT_DAYS;
}

function groupItem(key: ItemKey, reason: PackingReason, essential = false, count: number | null = null): PackingItem {
  return { id: key, key, label: "", memberId: null, reason, essential, count };
}

// One day at one destination. Every destination's weather is read together: the rainiest, hottest, and coldest
// day of the whole trip decide, wherever they fall.
type PlaceDay = { place: string; day: WeatherDay };

function pick(entries: PlaceDay[], score: (day: WeatherDay) => number): PlaceDay | null {
  return entries.reduce<PlaceDay | null>(
    (best, entry) => (best === null || score(entry.day) > score(best.day) ? entry : best),
    null,
  );
}

function weatherItems(weather: Weather | null, people: number): PackingItem[] {
  if (!weather) return [];
  const entries = weather.places.flatMap((entry) => entry.days.map((day): PlaceDay => ({ place: entry.place, day })));
  const items: PackingItem[] = [];

  const wettest = pick(entries, (day) => day.rainChance ?? (day.rainMm ?? 0) * 10);
  if (wettest && isRainy(wettest.day)) {
    const { place, day } = wettest;
    const reason: PackingReason = { kind: "rain", place, date: day.date, chance: day.rainChance };
    items.push(groupItem("rainGear", reason, false, people), groupItem("dryBag", reason));
  }

  const hottest = pick(entries, (day) => day.tempMax);
  if (hottest && hottest.day.tempMax >= HOT) {
    const { place, day } = hottest;
    const reason: PackingReason = { kind: "heat", place, date: day.date, temp: day.tempMax, typical: day.source === "typical" };
    items.push(groupItem("sunCare", reason), groupItem("waterBottle", reason, false, people));
  }

  const coldest = pick(entries, (day) => -day.tempMin);
  if (coldest && coldest.day.tempMin <= COOL) {
    const { place, day } = coldest;
    const reason: PackingReason = { kind: "cold", place, date: day.date, temp: day.tempMin, typical: day.source === "typical" };
    items.push(groupItem("warmLayer", reason, false, people));
    if (day.tempMin <= FREEZING) items.push(groupItem("winterWear", reason, false, people));
  }
  return items;
}

function memberItems(member: Member): PackingItem[] {
  const items: PackingItem[] = [];
  const add = (rule: Rule, reason: PackingReason) => {
    // The same thing asked for twice (comfortable shoes for age and for short walks) is packed once.
    if (items.some((item) => item.key === rule.key)) return;
    items.push({
      id: `${rule.key}:${member.id}`,
      key: rule.key,
      label: "",
      memberId: member.id,
      reason,
      essential: rule.essential ?? false,
      count: null,
    });
  };

  BY_AGE[member.ageGroup].forEach((rule) => add(rule, { kind: "age", ageGroup: member.ageGroup }));
  member.needs.forEach((need) => BY_NEED[need].forEach((rule) => add(rule, { kind: "need", need })));
  const allergies = member.allergies.trim();
  if (allergies) {
    const reason: PackingReason = { kind: "allergy", allergies };
    add({ key: "allergyMeds", essential: true }, reason);
    add({ key: "allergyCard", essential: true }, reason);
  }
  return items;
}

// Clothes for every day up to a week. Past that the group's choice decides: wash on the road or use a laundry,
// and a week's clothes do; carry it all, and the count follows the days.
function clothesItems(draft: PlanDraft): PackingItem[] {
  const days = tripDayCount(draft);
  const choice = draft.packing.laundry;
  if (!needsLaundryChoice(draft)) return [groupItem("clothes", { kind: "basics" }, false, days)];
  if (choice === null) return [groupItem("clothes", { kind: "basics" }, false, MAX_OUTFIT_DAYS)];
  const reason: PackingReason = { kind: "laundry", choice };
  const items = [groupItem("clothes", reason, false, choice === "all" ? days : MAX_OUTFIT_DAYS)];
  if (choice === "wash") items.push(groupItem("laundryKit", reason));
  if (choice === "laundry") items.push(groupItem("laundryBag", reason));
  return items;
}

function tripItems(draft: PlanDraft): PackingItem[] {
  const basics: PackingReason = { kind: "basics" };
  const items = [
    groupItem("ids", basics, true),
    groupItem("money", basics),
    groupItem("chargers", basics),
    groupItem("personalMeds", basics, true),
    groupItem("firstAid", basics),
    ...clothesItems(draft),
    groupItem("toiletries", basics),
  ];
  draft.extras.transport.forEach((transport) => {
    const rule = BY_TRANSPORT[transport];
    if (rule) items.push(groupItem(rule.key, { kind: "transport", transport }, rule.essential ?? false));
  });
  const outdoors = draft.members.some((member) => member.interests.nature !== undefined);
  if (outdoors) items.push(groupItem("outdoorKit", { kind: "interest", interest: "nature" }));
  return items;
}

/**
 * Everything on the group's packing list, removed items left out. What members depend on comes first, then what
 * the weather asks for, then the rest, then what Captain and the group added: the order of what hurts most to
 * forget.
 */
export function buildPackingList(draft: PlanDraft, weather: Weather | null): PackingItem[] {
  const known = new Set(draft.members.map((member) => member.id));
  const forMember = (memberId: string | null) => (memberId !== null && known.has(memberId) ? memberId : null);
  const personal = draft.members.flatMap(memberItems);
  const trip = tripItems(draft);
  const captain = (draft.packing.captain ?? []).map((item): PackingItem => ({
    id: item.id,
    key: null,
    label: item.label,
    memberId: forMember(item.memberId),
    reason: { kind: "captain", note: item.reason },
    essential: item.essential,
    count: null,
  }));
  const own = draft.packing.own.map((item): PackingItem => ({
    id: item.id,
    key: null,
    label: item.label,
    memberId: forMember(item.memberId),
    reason: { kind: "own" },
    essential: false,
    count: null,
  }));
  const generated = [...personal, ...captain, ...trip, ...weatherItems(weather, draft.members.length)];
  const ordered = [
    ...generated.filter((item) => item.essential),
    ...generated.filter((item) => !item.essential && isWeatherReason(item.reason)),
    ...generated.filter((item) => !item.essential && !isWeatherReason(item.reason)),
    ...own,
  ];
  return ordered.filter((item) => !draft.packing.removed.includes(item.id));
}

export function isWeatherReason(reason: PackingReason): boolean {
  return reason.kind === "rain" || reason.kind === "heat" || reason.kind === "cold";
}

/** What the group wrote freely, the part fixed rules cannot read. Empty when there is nothing for Captain to add. */
export function hasFreeText(draft: PlanDraft): boolean {
  const { extras } = draft;
  return (
    draft.notes.trim() !== "" ||
    [extras.mustVisit, extras.occasion, extras.avoid, extras.lodging].some((entry) => entry.trim() !== "") ||
    extras.customTransport.length > 0 ||
    draft.members.some(
      (member) => member.customNeeds.length > 0 || member.customInterests.length > 0 || member.allergies.trim() !== "",
    )
  );
}
