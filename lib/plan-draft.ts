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

export type Member = {
  id: string;
  name: string;
  ageGroup: AgeGroup;
  needs: NeedKey[];
  allergies: string;
  interests: Partial<Record<InterestKey, WishLevel>>;
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
};

export type ExtraTextKey = Exclude<keyof TripExtras, "flexibleDates" | "transport">;

export type PlanDraft = {
  origin: string;
  destinations: string[];
  startDate: string;
  endDate: string;
  members: Member[];
  budget: number | null;
  pace: Pace | null;
  extras: TripExtras;
  notes: string;
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
};

export const EMPTY_DRAFT: PlanDraft = {
  origin: "",
  destinations: [],
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  members: [],
  budget: null,
  pace: null,
  extras: EMPTY_EXTRAS,
  notes: "",
};

export function createMember(ageGroup: AgeGroup = "adult", name = ""): Member {
  return { id: crypto.randomUUID(), name, ageGroup, needs: [], allergies: "", interests: {} };
}

export type PlanDraftAction =
  | { type: "setOrigin"; value: string }
  | { type: "addDestination"; value: string }
  | { type: "removeDestination"; index: number }
  | { type: "setDate"; field: "startDate" | "endDate"; value: string }
  | { type: "addMember"; member: Member }
  | { type: "removeMember"; id: string }
  | { type: "updateMember"; id: string; changes: Partial<Pick<Member, "name" | "ageGroup" | "allergies">> }
  | { type: "toggleMemberNeed"; id: string; need: NeedKey }
  | { type: "setMemberInterest"; id: string; interest: InterestKey; level: WishLevel | null }
  | { type: "setBudget"; value: number | null }
  | { type: "setPace"; value: Pace }
  | { type: "setExtraText"; key: ExtraTextKey; value: string }
  | { type: "setFlexibleDates"; value: boolean }
  | { type: "toggleTransport"; value: TransportKey }
  | { type: "patch"; patch: DraftPatch }
  | { type: "appendNote"; value: string }
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

export function planDraftReducer(draft: PlanDraft, action: PlanDraftAction): PlanDraft {
  switch (action.type) {
    case "replace":
      return action.draft;
    case "setOrigin":
      return { ...draft, origin: action.value };
    case "addDestination": {
      const value = action.value.trim();
      if (!value || draft.destinations.includes(value)) return draft;
      return { ...draft, destinations: [...draft.destinations, value] };
    }
    case "removeDestination":
      return { ...draft, destinations: draft.destinations.filter((_, index) => index !== action.index) };
    case "setDate":
      return { ...draft, [action.field]: action.value };
    case "addMember":
      if (draft.members.length >= MAX_MEMBERS) return draft;
      return { ...draft, members: [...draft.members, action.member] };
    case "removeMember":
      return { ...draft, members: draft.members.filter((member) => member.id !== action.id) };
    case "updateMember":
      return mapMember(draft, action.id, (member) => ({ ...member, ...action.changes }));
    case "toggleMemberNeed":
      return mapMember(draft, action.id, (member) => ({
        ...member,
        needs: toggleItem(member.needs, action.need),
      }));
    case "setMemberInterest":
      return mapMember(draft, action.id, (member) => setInterest(member, action.interest, action.level));
    case "setBudget":
      return { ...draft, budget: action.value };
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
    case "patch": {
      const { extras, ...rest } = action.patch;
      return { ...draft, ...rest, extras: { ...draft.extras, ...extras } };
    }
    case "appendNote":
      return { ...draft, notes: draft.notes ? `${draft.notes}\n${action.value}` : action.value };
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
  return filledText + (extras.flexibleDates ? 1 : 0) + (extras.transport.length > 0 ? 1 : 0);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseMember(value: unknown): Member | null {
  if (!isRecord(value)) return null;
  const ageGroupRaw = typeof value.ageGroup === "string" ? value.ageGroup.toLowerCase() : "adult";
  const ageGroup = isAgeGroup(ageGroupRaw) ? ageGroupRaw : "adult";
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
    needs: Array.isArray(value.needs) ? value.needs.filter(isNeedKey) : [],
    allergies: typeof value.allergies === "string" ? value.allergies : "",
    interests,
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
  return extras;
}

export function parseDraftPatch(value: unknown): DraftPatch {
  if (!isRecord(value)) return {};
  const patch: DraftPatch = {};
  if (typeof value.origin === "string") {
    const o = value.origin.trim();
    if (o) patch.origin = o;
  }

  let rawDestinations = value.destinations ?? (value as any).destination;
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
  return { ...draft, notes: typeof value.notes === "string" ? value.notes : "" };
}

export function fillTemplate(template: string, values: Record<string, number | string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}
