import type { Currency } from "./currency";
import { MAX_PHONE_CHARS } from "./safety/contact";

export const AGE_GROUPS = ["adult", "elderly", "child", "toddler"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const NEED_CATEGORIES = {
  mobility: ["wheelchair", "noStairs", "shortWalks"],
  diet: ["halal", "vegetarian", "vegan"],
  rest: ["nap", "frequentBreaks"],
  sensory: ["quiet", "noCrowds"],
  other: ["nearToilet"],
} as const;

export type NeedCategory = keyof typeof NEED_CATEGORIES;
export type NeedKey = (typeof NEED_CATEGORIES)[NeedCategory][number];

export const NEED_CATEGORY_KEYS = Object.keys(NEED_CATEGORIES) as NeedCategory[];
export const NEED_KEYS: NeedKey[] = NEED_CATEGORY_KEYS.flatMap((category) => [...NEED_CATEGORIES[category]]);

export const INTEREST_KEYS = ["museum", "shopping", "nature", "food", "themePark"] as const;
export type InterestKey = (typeof INTEREST_KEYS)[number];
export type WishLevel = "must" | "nice";

export const TRANSPORT_KEYS = ["public", "taxi", "rental"] as const;
export type TransportKey = (typeof TRANSPORT_KEYS)[number];

export const PACES = ["relaxed", "packed"] as const;
export type Pace = (typeof PACES)[number];

export type CustomInterest = { label: string; level: WishLevel };

export const OPTION_KEYS = ["adapt", "split", "swap", "breaks", "slow", "turns", "oneEach"] as const;
export type OptionKey = (typeof OPTION_KEYS)[number];
/** How the group settled each clash between its wishes: the clash's id, and the option picked (see ./mediation). */
export type Agreements = Record<string, OptionKey>;

// The `custom` fields hold what someone typed because none of the choices fit.
export type Member = {
  id: string;
  name: string;
  ageGroup: AgeGroup;
  /** Exact age in years when it was given. It always falls inside `ageGroup`. */
  age: number | null;
  needs: NeedKey[];
  customNeeds: string[];
  allergies: string;
  interests: Partial<Record<InterestKey, WishLevel>>;
  customInterests: CustomInterest[];
  /** The number the group reaches this member on. Left out until someone types one; empty once it is cleared. */
  phone?: string;
  /** Whether the member carries a phone on the trip. Left out until someone says. */
  carriesPhone?: boolean;
};

/** What the plan says about reaching one member. `null` is "never said", which leaves what is kept as it is. */
export type MemberContact = { memberId: string; phone: string | null; carriesPhone: boolean | null };

export const LAUNDRY_CHOICES = ["wash", "laundry", "all"] as const;
/** How a trip longer than a week handles clothes: wash on the road, use a laundry, or carry enough for every day. */
export type LaundryChoice = (typeof LAUNDRY_CHOICES)[number];

/** An item the group typed into its packing list. `memberId` is null when it is for everyone. */
export type OwnPackingItem = { id: string; label: string; memberId: string | null };
/** An item Captain added after reading what the group wrote freely, with the reason in Captain's words. */
export type CaptainPackingItem = OwnPackingItem & { reason: string; essential: boolean };
/**
 * What the group has done with its packing list. The list itself is worked out from the trip each time (see
 * ./packing); only the ticks, the removals, and the additions are kept. `captain` is null until Captain has read
 * the trip once.
 */
export type PackingState = {
  checked: string[];
  removed: string[];
  own: OwnPackingItem[];
  captain: CaptainPackingItem[] | null;
  laundry: LaundryChoice | null;
};

export type TripExtras = {
  flexibleDates: boolean;
  arrivalTime: string;
  departureTime: string;
  lodging: string;
  mustVisit: string;
  avoid: string;
  occasion: string;
  dayStart: string;
  dayEnd: string;
  transport: TransportKey[];
  customTransport: string[];
};

export type ExtraTextKey = Exclude<keyof TripExtras, "flexibleDates" | "transport" | "customTransport">;

export type PlanDraft = {
  origin: string;
  destinations: string[];
  startDate: string;
  endDate: string;
  members: Member[];
  /** The total in Rupiah, whichever currency it was typed in. */
  budget: number | null;
  budgetCurrency: Currency;
  /** The dollar amount as typed. Null when the budget was typed in Rupiah. */
  budgetUsd: number | null;
  pace: Pace | null;
  extras: TripExtras;
  notes: string;
  agreements: Agreements;
  packing: PackingState;
};

export type PassField = "route" | "dates" | "group" | "budget" | "pace";

export const PASS_FIELDS: PassField[] = ["route", "dates", "group", "budget", "pace"];

export type DraftPatch = {
  origin?: string;
  destinations?: string[];
  startDate?: string;
  endDate?: string;
  members?: Member[];
  budget?: number;
  pace?: Pace;
  extras?: Partial<TripExtras>;
};

export const MAX_MEMBERS = 50;
export const MAX_NOTES_CHARS = 500;
export const MAX_AGE = 120;
export const MAX_CUSTOM_ENTRIES = 8;
export const MAX_CUSTOM_CHARS = 60;
const MAX_AGREEMENTS = 12;
export const MAX_OWN_PACKING = 30;
export const MAX_CAPTAIN_PACKING = 8;
const MAX_PACKING_IDS = 200;
const MAX_PACKING_ID_CHARS = 80;
const MAX_PACKING_REASON_CHARS = 140;
const MAX_CONFLICT_ID_CHARS = 40;

const EMPTY_EXTRAS: TripExtras = {
  flexibleDates: false,
  arrivalTime: "",
  departureTime: "",
  lodging: "",
  mustVisit: "",
  avoid: "",
  occasion: "",
  dayStart: "",
  dayEnd: "",
  transport: [],
  customTransport: [],
};

export const EMPTY_DRAFT: PlanDraft = {
  origin: "",
  destinations: [],
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  members: [],
  budget: null,
  budgetCurrency: "IDR",
  budgetUsd: null,
  pace: null,
  extras: EMPTY_EXTRAS,
  notes: "",
  agreements: {},
  packing: { checked: [], removed: [], own: [], captain: null, laundry: null },
};

/** Children and toddlers are taken not to carry a phone until someone says otherwise. */
export function carriesPhoneByDefault(ageGroup: AgeGroup): boolean {
  return ageGroup !== "child" && ageGroup !== "toddler";
}

export function createMember(ageGroup: AgeGroup = "adult"): Member {
  return {
    id: crypto.randomUUID(),
    name: "",
    ageGroup,
    age: null,
    needs: [],
    customNeeds: [],
    allergies: "",
    interests: {},
    customInterests: [],
  };
}

export type PlanDraftAction =
  | { type: "setOrigin"; value: string }
  | { type: "addDestination"; value: string }
  | { type: "removeDestination"; index: number }
  | { type: "setDate"; field: "startDate" | "endDate"; value: string }
  | { type: "addMember"; member: Member }
  /** Takes in a member who joined through the group's link, unless the plan has them already. */
  | { type: "mergeMember"; member: Member }
  | { type: "removeMember"; id: string }
  | { type: "updateMember"; id: string; changes: Partial<Pick<Member, "name" | "ageGroup" | "allergies" | "phone" | "carriesPhone">> }
  | { type: "setMemberAge"; id: string; age: number | null }
  | { type: "toggleMemberNeed"; id: string; need: NeedKey }
  | { type: "addMemberCustomNeed"; id: string; value: string }
  | { type: "removeMemberCustomNeed"; id: string; value: string }
  | { type: "setMemberInterest"; id: string; interest: InterestKey; level: WishLevel | null }
  | { type: "setMemberCustomInterest"; id: string; label: string; level: WishLevel | null }
  | { type: "setBudget"; value: number | null }
  | { type: "setBudgetUsd"; usd: number | null; idr: number | null }
  | { type: "setBudgetCurrency"; value: Currency }
  | { type: "setPace"; value: Pace }
  | { type: "setExtraText"; key: ExtraTextKey; value: string }
  | { type: "setFlexibleDates"; value: boolean }
  | { type: "toggleTransport"; value: TransportKey }
  | { type: "addCustomTransport"; value: string }
  | { type: "removeCustomTransport"; value: string }
  | { type: "patch"; patch: DraftPatch }
  | { type: "setNotes"; value: string }
  | { type: "setAgreement"; conflict: string; option: OptionKey }
  | { type: "togglePacked"; id: string }
  | { type: "removePackingItem"; id: string }
  | { type: "restorePackingItems" }
  | { type: "addOwnPackingItem"; label: string; memberId: string | null }
  | { type: "setCaptainPacking"; items: CaptainPackingItem[] }
  | { type: "setLaundry"; choice: LaundryChoice }
  | { type: "replace"; draft: PlanDraft };

function toggleItem<Item>(items: Item[], item: Item): Item[] {
  return items.includes(item) ? items.filter((entry) => entry !== item) : [...items, item];
}

function mapMember(draft: PlanDraft, id: string, change: (member: Member) => Member): PlanDraft {
  return { ...draft, members: draft.members.map((member) => (member.id === id ? change(member) : member)) };
}

function setInterest(member: Member, interest: InterestKey, level: WishLevel | null): Member {
  const interests = { ...member.interests };
  if (level === null) {
    delete interests[interest];
  } else {
    interests[interest] = level;
  }
  return { ...member, interests };
}

export function sameText(first: string, second: string): boolean {
  return first.trim().toLowerCase() === second.trim().toLowerCase();
}

/**
 * The age group an exact age belongs to. The boundaries are the ones WHO's physical activity guidelines use:
 * under 5 (2019 guidelines for children under 5), then 5 to 17, 18 to 64, and 65 and older (2020 guidelines).
 */
export function ageGroupFor(age: number): AgeGroup {
  if (age < 5) return "toddler";
  if (age < 18) return "child";
  return age < 65 ? "adult" : "elderly";
}

function cleanEntry(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_CUSTOM_CHARS).trim();
}

// A hand-typed entry joins a list once: blank text, a repeat in any letter
// case, and anything past the limit are left out.
function addEntry(entries: string[], value: string): string[] {
  const entry = cleanEntry(value);
  const repeated = entries.some((existing) => sameText(existing, entry));
  if (!entry || repeated || entries.length >= MAX_CUSTOM_ENTRIES) return entries;
  return [...entries, entry];
}

function removeEntry(entries: string[], value: string): string[] {
  return entries.filter((entry) => !sameText(entry, value));
}

// Sets the level of a hand-typed wish, adding the wish when it is new. A null level removes it.
function setCustomInterest(wishes: CustomInterest[], value: string, level: WishLevel | null): CustomInterest[] {
  const label = cleanEntry(value);
  const others = wishes.filter((wish) => !sameText(wish.label, label));
  if (level === null) return others;
  if (others.length < wishes.length) {
    return wishes.map((wish) => (sameText(wish.label, label) ? { ...wish, level } : wish));
  }
  if (!label || wishes.length >= MAX_CUSTOM_ENTRIES) return wishes;
  return [...wishes, { label, level }];
}

/** Every hand-typed need in the group, once each. */
export function listCustomNeeds(members: Member[]): string[] {
  const needs: string[] = [];
  members
    .flatMap((member) => member.customNeeds)
    .forEach((need) => {
      if (!needs.some((known) => sameText(known, need))) needs.push(need);
    });
  return needs;
}

export function planDraftReducer(draft: PlanDraft, action: PlanDraftAction): PlanDraft {
  switch (action.type) {
    case "replace":
      return action.draft;
    case "setOrigin":
      return { ...draft, origin: action.value };
    case "addDestination": {
      const value = action.value.trim();
      if (!value || draft.destinations.some((city) => sameText(city, value))) return draft;
      return { ...draft, destinations: [...draft.destinations, value] };
    }
    case "removeDestination":
      return { ...draft, destinations: draft.destinations.filter((_, index) => index !== action.index) };
    case "setDate":
      return { ...draft, [action.field]: action.value };
    case "addMember":
      if (draft.members.length >= MAX_MEMBERS) return draft;
      return { ...draft, members: [...draft.members, action.member] };
    case "mergeMember":
      if (draft.members.length >= MAX_MEMBERS || draft.members.some((member) => member.id === action.member.id)) return draft;
      return { ...draft, members: [...draft.members, action.member] };
    case "removeMember":
      return { ...draft, members: draft.members.filter((member) => member.id !== action.id) };
    case "updateMember":
      return mapMember(draft, action.id, (member) => {
        const changed = { ...member, ...action.changes };
        // An exact age that no longer fits the chosen group is dropped instead of left contradicting it.
        const ageFits = changed.age === null || ageGroupFor(changed.age) === changed.ageGroup;
        return ageFits ? changed : { ...changed, age: null };
      });
    case "setMemberAge":
      return mapMember(draft, action.id, (member) => ({
        ...member,
        age: action.age,
        ageGroup: action.age === null ? member.ageGroup : ageGroupFor(action.age),
      }));
    case "addMemberCustomNeed":
      return mapMember(draft, action.id, (member) => ({
        ...member,
        customNeeds: addEntry(member.customNeeds, action.value),
      }));
    case "removeMemberCustomNeed":
      return mapMember(draft, action.id, (member) => ({
        ...member,
        customNeeds: removeEntry(member.customNeeds, action.value),
      }));
    case "setMemberCustomInterest":
      return mapMember(draft, action.id, (member) => ({
        ...member,
        customInterests: setCustomInterest(member.customInterests, action.label, action.level),
      }));
    case "toggleMemberNeed":
      return mapMember(draft, action.id, (member) => ({
        ...member,
        needs: toggleItem(member.needs, action.need),
      }));
    case "setMemberInterest":
      return mapMember(draft, action.id, (member) => setInterest(member, action.interest, action.level));
    case "setBudget":
      return { ...draft, budget: action.value, budgetUsd: null };
    case "setBudgetUsd":
      return { ...draft, budget: action.idr, budgetUsd: action.usd };
    case "setBudgetCurrency":
      return { ...draft, budgetCurrency: action.value, budgetUsd: null };
    case "setPace":
      return { ...draft, pace: action.value };
    case "setExtraText":
      return { ...draft, extras: { ...draft.extras, [action.key]: action.value } };
    case "setFlexibleDates":
      return { ...draft, extras: { ...draft.extras, flexibleDates: action.value } };
    case "toggleTransport":
      return {
        ...draft,
        extras: { ...draft.extras, transport: toggleItem(draft.extras.transport, action.value) },
      };
    case "addCustomTransport":
      return {
        ...draft,
        extras: { ...draft.extras, customTransport: addEntry(draft.extras.customTransport, action.value) },
      };
    case "removeCustomTransport":
      return {
        ...draft,
        extras: { ...draft.extras, customTransport: removeEntry(draft.extras.customTransport, action.value) },
      };
    case "patch": {
      const { extras, ...rest } = action.patch;
      const patched = { ...draft, ...rest, extras: { ...draft.extras, ...extras } };
      // A budget that arrives in a patch is in Rupiah, so it replaces any dollars typed before.
      return rest.budget === undefined ? patched : { ...patched, budgetCurrency: "IDR", budgetUsd: null };
    }
    case "setNotes":
      return { ...draft, notes: action.value.slice(0, MAX_NOTES_CHARS) };
    case "setAgreement":
      return { ...draft, agreements: { ...draft.agreements, [action.conflict]: action.option } };
    case "togglePacked":
      return { ...draft, packing: { ...draft.packing, checked: toggleItem(draft.packing.checked, action.id) } };
    case "removePackingItem": {
      const packing = draft.packing;
      // Something the group typed is deleted outright; anything else is only hidden, so it can be brought back.
      if (packing.own.some((item) => item.id === action.id)) {
        return { ...draft, packing: { ...packing, own: packing.own.filter((item) => item.id !== action.id) } };
      }
      return { ...draft, packing: { ...packing, removed: [...new Set([...packing.removed, action.id])] } };
    }
    case "restorePackingItems":
      return { ...draft, packing: { ...draft.packing, removed: [] } };
    case "addOwnPackingItem": {
      const label = cleanEntry(action.label);
      const own = draft.packing.own;
      const repeated = own.some((item) => item.memberId === action.memberId && sameText(item.label, label));
      if (!label || repeated || own.length >= MAX_OWN_PACKING) return draft;
      const added = { id: `own:${crypto.randomUUID()}`, label, memberId: action.memberId };
      return { ...draft, packing: { ...draft.packing, own: [...own, added] } };
    }
    case "setCaptainPacking":
      return { ...draft, packing: { ...draft.packing, captain: action.items.slice(0, MAX_CAPTAIN_PACKING) } };
    case "setLaundry":
      return { ...draft, packing: { ...draft.packing, laundry: action.choice } };
  }
}

function hasRoute(draft: PlanDraft): boolean {
  return draft.origin.trim() !== "" && draft.destinations.length > 0;
}

export function hasDates(draft: PlanDraft): boolean {
  return draft.startDate !== "" && draft.endDate !== "";
}

export function hasDateError(draft: PlanDraft): boolean {
  return hasDates(draft) && draft.endDate < draft.startDate;
}

export function hasBudget(draft: PlanDraft): boolean {
  return draft.budget !== null && draft.budget > 0;
}

export function missingFields(draft: PlanDraft): PassField[] {
  const missing: PassField[] = [];
  if (!hasRoute(draft)) missing.push("route");
  if (!hasDates(draft) || hasDateError(draft)) missing.push("dates");
  if (draft.members.length === 0) missing.push("group");
  if (!hasBudget(draft)) missing.push("budget");
  if (draft.pace === null) missing.push("pace");
  return missing;
}

/** What the plan says about reaching each member, for the members it says anything about. */
export function contactsOf(draft: PlanDraft): MemberContact[] {
  return draft.members.flatMap((member) =>
    member.phone === undefined && member.carriesPhone === undefined
      ? []
      : [{ memberId: member.id, phone: member.phone ?? null, carriesPhone: member.carriesPhone ?? null }],
  );
}

/**
 * The plan without anyone's phone number. Numbers are kept sealed with the trip's members, so they are taken out
 * of the plan before it is stored and before it is handed to Captain.
 */
export function withoutContacts(draft: PlanDraft): PlanDraft {
  return {
    ...draft,
    members: draft.members.map((member) => {
      const kept = { ...member };
      delete kept.phone;
      delete kept.carriesPhone;
      return kept;
    }),
  };
}

export function isDraftEmpty(draft: PlanDraft): boolean {
  return missingFields(draft).length === PASS_FIELDS.length && draft.origin.trim() === "" && draft.destinations.length === 0;
}

export function countFilledExtras(extras: TripExtras): number {
  const textKeys: ExtraTextKey[] = [
    "arrivalTime",
    "departureTime",
    "lodging",
    "mustVisit",
    "avoid",
    "occasion",
    "dayStart",
    "dayEnd",
  ];
  const filledText = textKeys.filter((key) => extras[key].trim() !== "").length;
  const hasTransport = extras.transport.length > 0 || extras.customTransport.length > 0;
  return filledText + (hasTransport ? 1 : 0);
}

/** Optional details the planner has filled in: the extras plus the free-text note. */
export function countFilledDetails(draft: PlanDraft): number {
  return countFilledExtras(draft.extras) + (draft.notes.trim() === "" ? 0 : 1);
}

export function getMemberName(member: Member, members: Member[], ageLabels: Record<AgeGroup, string>): string {
  const name = member.name.trim();
  if (name) return name;
  const sameGroup = members.filter((entry) => entry.ageGroup === member.ageGroup && entry.name.trim() === "");
  return `${ageLabels[member.ageGroup]} ${sameGroup.indexOf(member) + 1}`;
}

export function parseLocalDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export function listTripDates(draft: PlanDraft, limit: number): string[] {
  if (!hasDates(draft) || hasDateError(draft)) return [];
  const dates: string[] = [];
  const cursor = parseLocalDate(draft.startDate);
  const end = parseLocalDate(draft.endDate);
  while (cursor <= end && dates.length < limit) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function includes<Value extends string>(values: readonly Value[], value: unknown): value is Value {
  return values.includes(value as Value);
}

export const isNeedKey = (value: unknown): value is NeedKey => includes(NEED_KEYS, value);
const isAgeGroup = (value: unknown): value is AgeGroup => includes(AGE_GROUPS, value);

const isTransportKey = (value: unknown): value is TransportKey => includes(TRANSPORT_KEYS, value);
const isOptionKey = (value: unknown): value is OptionKey => includes(OPTION_KEYS, value);
const isLaundryChoice = (value: unknown): value is LaundryChoice => includes(LAUNDRY_CHOICES, value);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseAge(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_AGE ? value : null;
}

function parseEntries(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .reduce<string[]>((entries, entry) => addEntry(entries, entry), []);
}

function parseCustomInterests(value: unknown): CustomInterest[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<CustomInterest[]>((wishes, entry) => {
    if (!isRecord(entry) || typeof entry.label !== "string") return wishes;
    return setCustomInterest(wishes, entry.label, entry.level === "must" ? "must" : "nice");
  }, []);
}

function parseMember(value: unknown): Member | null {
  if (!isRecord(value)) return null;
  const ageGroupRaw = typeof value.ageGroup === "string" ? value.ageGroup.toLowerCase() : "adult";
  const ageGroup = isAgeGroup(ageGroupRaw) ? ageGroupRaw : "adult";
  const age = parseAge(value.age);
  const interests: Member["interests"] = {};
  if (isRecord(value.interests)) {
    INTEREST_KEYS.forEach((interest) => {
      const level = (value.interests as Record<string, unknown>)[interest];
      if (level === "must" || level === "nice") interests[interest] = level;
    });
  }
  return {
    id: typeof value.id === "string" && value.id ? value.id : crypto.randomUUID(),
    name: typeof value.name === "string" ? value.name : "",
    ageGroup: ageGroup,
    age: age !== null && ageGroupFor(age) === ageGroup ? age : null,
    needs: Array.isArray(value.needs) ? value.needs.filter(isNeedKey) : [],
    customNeeds: parseEntries(value.customNeeds),
    allergies: typeof value.allergies === "string" ? value.allergies : "",
    interests,
    customInterests: parseCustomInterests(value.customInterests),
    ...(typeof value.phone === "string" ? { phone: value.phone.slice(0, MAX_PHONE_CHARS) } : {}),
    ...(typeof value.carriesPhone === "boolean" ? { carriesPhone: value.carriesPhone } : {}),
  };
}

function parseExtras(value: unknown): Partial<TripExtras> {
  if (!isRecord(value)) return {};
  const extras: Partial<TripExtras> = {};
  const textKeys: ExtraTextKey[] = [
    "arrivalTime",
    "departureTime",
    "lodging",
    "mustVisit",
    "avoid",
    "occasion",
    "dayStart",
    "dayEnd",
  ];
  textKeys.forEach((key) => {
    const entry = value[key];
    if (typeof entry === "string") extras[key] = entry;
  });
  if (typeof value.flexibleDates === "boolean") extras.flexibleDates = value.flexibleDates;
  if (Array.isArray(value.transport)) extras.transport = value.transport.filter(isTransportKey);
  if (Array.isArray(value.customTransport)) extras.customTransport = parseEntries(value.customTransport);
  return extras;
}

// Whether a pick still fits its clash is checked where it is used: the clashes change as the group does.
function parseAgreements(value: unknown): Agreements {
  if (!isRecord(value)) return {};
  const agreements: Agreements = {};
  Object.entries(value)
    .filter(([conflict]) => conflict.length <= MAX_CONFLICT_ID_CHARS)
    .slice(0, MAX_AGREEMENTS)
    .forEach(([conflict, option]) => {
      if (isOptionKey(option)) agreements[conflict] = option;
    });
  return agreements;
}

function parseIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter((id): id is string => typeof id === "string" && id !== "" && id.length <= MAX_PACKING_ID_CHARS);
  return [...new Set(ids)].slice(0, MAX_PACKING_IDS);
}

function parseOwnItem(value: unknown): OwnPackingItem | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.label !== "string") return null;
  const label = cleanEntry(value.label);
  if (!label || value.id === "" || value.id.length > MAX_PACKING_ID_CHARS) return null;
  return { id: value.id, label, memberId: typeof value.memberId === "string" && value.memberId ? value.memberId : null };
}

/** Reads what Captain sent or what was stored of it. Anything that is not a named item is left out. */
export function parseCaptainPacking(value: unknown): CaptainPackingItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((entry): CaptainPackingItem[] => {
      const item = parseOwnItem(entry);
      if (!item || !isRecord(entry)) return [];
      const reason = typeof entry.reason === "string" ? entry.reason.replace(/\s+/g, " ").trim() : "";
      return [{ ...item, reason: reason.slice(0, MAX_PACKING_REASON_CHARS), essential: entry.essential === true }];
    })
    .slice(0, MAX_CAPTAIN_PACKING);
}

/** Reads what the group did with its packing list, as the browser sent it or as it was stored. */
export function parsePacking(value: unknown): PackingState {
  if (!isRecord(value)) return EMPTY_DRAFT.packing;
  return {
    checked: parseIds(value.checked),
    removed: parseIds(value.removed),
    own: Array.isArray(value.own) ? value.own.flatMap((item) => parseOwnItem(item) ?? []).slice(0, MAX_OWN_PACKING) : [],
    captain: Array.isArray(value.captain) ? parseCaptainPacking(value.captain) : null,
    laundry: isLaundryChoice(value.laundry) ? value.laundry : null,
  };
}

export function parseDraftPatch(value: unknown): DraftPatch {
  if (!isRecord(value)) return {};
  const patch: DraftPatch = {};
  if (typeof value.origin === "string") {
    const o = value.origin.trim();
    if (o) patch.origin = o;
  }

  let rawDestinations = value.destinations ?? value.destination;
  if (typeof rawDestinations === "string") {
    rawDestinations = [rawDestinations];
  }

  if (Array.isArray(rawDestinations)) {
    const validDests = rawDestinations.filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "");
    if (validDests.length > 0) patch.destinations = validDests;
  }
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (typeof value.startDate === "string") {
    const s = value.startDate.trim();
    if (s && dateRegex.test(s)) patch.startDate = s;
  }
  if (typeof value.endDate === "string") {
    const e = value.endDate.trim();
    if (e && dateRegex.test(e)) patch.endDate = e;
  }
  
  if (Array.isArray(value.members)) {
    const validMembers = value.members.flatMap((entry) => parseMember(entry) ?? []).slice(0, MAX_MEMBERS);
    if (validMembers.length > 0) patch.members = validMembers;
  }
  const parsedBudget = typeof value.budget === "string" ? Number(value.budget.replace(/[^0-9]/g, '')) : value.budget;
  if (typeof parsedBudget === "number" && !isNaN(parsedBudget) && parsedBudget > 0) patch.budget = Math.round(parsedBudget);
  
  if (typeof value.pace === "string") {
    const p = value.pace.toLowerCase().trim();
    if (p === "packed" || p === "padat" || p === "cepat") {
      patch.pace = "packed";
    } else if (p === "relaxed" || p === "santai") {
      patch.pace = "relaxed";
    }
  }

  if (value.extras !== undefined) {
    const e = parseExtras(value.extras);
    if (Object.keys(e).length > 0) patch.extras = e;
  }
  return patch;
}

export function parsePlanDraft(value: unknown): PlanDraft | null {
  if (!isRecord(value)) return null;
  const draft = planDraftReducer(EMPTY_DRAFT, { type: "patch", patch: parseDraftPatch(value) });
  const inDollars = value.budgetCurrency === "USD";
  const usd = Number.isInteger(value.budgetUsd) ? Number(value.budgetUsd) : 0;
  return {
    ...draft,
    budgetCurrency: inDollars ? "USD" : "IDR",
    budgetUsd: inDollars && draft.budget !== null && usd > 0 ? usd : null,
    notes: typeof value.notes === "string" ? value.notes : "",
    agreements: parseAgreements(value.agreements),
    packing: parsePacking(value.packing),
  };
}

export function fillTemplate(template: string, values: Record<string, number | string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}
