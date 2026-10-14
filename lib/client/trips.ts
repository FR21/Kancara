import { withTimeout } from "@/lib/client/abort";
import { type Itinerary, parseItinerary } from "@/lib/client/captain";
import { type PlanDraft, AGE_GROUPS, isNeedKey, parsePlanDraft, PASS_FIELDS } from "@/lib/plan-draft";
import {
  type ActiveTrips,
  type HistoryTrips,
  type TripActivity,
  type TripCard,
  type TripCardMember,
  type TripPlanView,
  OFFLINE_STATES,
  TRIP_ROLES,
  TRIP_STATUSES,
} from "@/lib/trips/trip";

export type HistoryFilter = { query: string; year: number | null };
/** `knownMembers` names the members who joined by themselves that this screen has taken into its plan (see the trip store). */
export type TripPlan = { name: string; draft: PlanDraft; violations?: number; itinerary?: Itinerary; knownMembers?: string[] };

export class TripsError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
  }
}

const BASE_URL = "/api/trips";
const REQUEST_TIMEOUT_MS = 15000;
const RATE_LIMIT_WAIT_MS = 1100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseMember(value: unknown): TripCardMember[] {
  if (!isRecord(value) || typeof value.id !== "string") return [];
  const ageGroup = AGE_GROUPS.find((entry) => entry === value.ageGroup);
  return ageGroup ? [{ id: value.id, ageGroup }] : [];
}

function parseActivity(value: unknown): TripActivity | undefined {
  if (!isRecord(value) || typeof value.time !== "string" || typeof value.title !== "string") return undefined;
  return { time: value.time, title: value.title };
}

function parseCost(value: unknown): TripCard["cost"] {
  if (!isRecord(value)) return undefined;
  const spent = asCount(value.spent);
  if (spent === undefined) return undefined;
  return { spent, budget: asCount(value.budget) ?? null };
}

function parseMissing(value: unknown): TripCard["missing"] {
  if (!Array.isArray(value)) return undefined;
  const listed: unknown[] = value;
  return PASS_FIELDS.filter((field) => listed.includes(field));
}

function parseCard(value: unknown): TripCard | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const status = TRIP_STATUSES.find((entry) => entry === value.status);
  const role = TRIP_ROLES.find((entry) => entry === value.role);
  if (!status || !role) return null;
  return {
    id: value.id,
    name: asText(value.name),
    status,
    role,
    origin: asText(value.origin),
    destinations: Array.isArray(value.destinations)
      ? value.destinations.filter((entry): entry is string => typeof entry === "string")
      : [],
    startDate: asText(value.startDate),
    endDate: asText(value.endDate),
    days: asCount(value.days) ?? 0,
    members: Array.isArray(value.members) ? value.members.flatMap(parseMember) : [],
    memberCount: asCount(value.memberCount) ?? 0,
    needs: Array.isArray(value.needs) ? value.needs.filter(isNeedKey) : [],
    customNeeds: Array.isArray(value.customNeeds)
      ? value.customNeeds.filter((entry): entry is string => typeof entry === "string")
      : [],
    budget: asCount(value.budget) ?? null,
    violations: asCount(value.violations),
    offline: OFFLINE_STATES.find((entry) => entry === value.offline),
    day: asCount(value.day),
    nextActivity: parseActivity(value.nextActivity),
    startsIn: asCount(value.startsIn),
    filled: asCount(value.filled),
    missing: parseMissing(value.missing),
    cost: parseCost(value.cost),
  };
}

function parseCards(value: unknown): TripCard[] {
  return Array.isArray(value) ? value.flatMap((entry) => parseCard(entry) ?? []) : [];
}

function parseSavedItinerary(value: unknown): Itinerary | null {
  try {
    return parseItinerary(value);
  } catch {
    return null;
  }
}

function parsePlanView(value: unknown): TripPlanView {
  const card = isRecord(value) ? parseCard(value.card) : null;
  const draft = isRecord(value) ? parsePlanDraft(value.draft) : null;
  if (!isRecord(value) || !card || !draft) throw new TripsError("Invalid trip response");
  return {
    card,
    draft,
    itinerary: parseSavedItinerary(value.itinerary),
    today: asText(value.today),
  };
}

function parseActive(value: unknown): ActiveTrips {
  if (!isRecord(value)) throw new TripsError("Invalid trips response");
  return {
    ongoing: parseCards(value.ongoing),
    upcoming: parseCards(value.upcoming),
    drafts: parseCards(value.drafts),
    nextOffset: asCount(value.nextOffset) ?? null,
  };
}

function parseHistory(value: unknown): HistoryTrips {
  if (!isRecord(value)) throw new TripsError("Invalid trips response");
  return {
    trips: parseCards(value.trips),
    total: asCount(value.total) ?? 0,
    countries: asCount(value.countries) ?? 0,
    years: Array.isArray(value.years) ? value.years.flatMap((entry) => asCount(entry) ?? []) : [],
    nextOffset: asCount(value.nextOffset) ?? null,
  };
}

async function send(path: string, init: RequestInit, signal?: AbortSignal, retried = false): Promise<Response> {
  const response = await fetch(`${BASE_URL}${path}`, { ...init, signal: withTimeout(signal, REQUEST_TIMEOUT_MS) });
  // Every API allows three requests a second; one busy moment is waited out, not shown as a failure.
  if (response.status === 429 && !retried) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
    return send(path, init, signal, true);
  }
  if (!response.ok) throw new TripsError(`Trips request failed with ${response.status}`, response.status);
  return response;
}

export const trips = {
  /** One page of trips that are not over. `offset` is the `nextOffset` of the page before it. */
  async active(signal: AbortSignal, offset = 0): Promise<ActiveTrips> {
    const response = await send(`?tab=active&offset=${offset}`, { method: "GET" }, signal);
    return parseActive(await response.json());
  },

  async history(filter: HistoryFilter, signal: AbortSignal, offset = 0): Promise<HistoryTrips> {
    const params = new URLSearchParams({ tab: "history", offset: String(offset) });
    if (filter.query.trim() !== "") params.set("q", filter.query.trim());
    if (filter.year !== null) params.set("year", String(filter.year));
    const response = await send(`?${params}`, { method: "GET" }, signal);
    return parseHistory(await response.json());
  },

  async plan(id: string, signal: AbortSignal): Promise<TripPlanView> {
    const response = await send(`/${encodeURIComponent(id)}`, { method: "GET" }, signal);
    return parsePlanView(await response.json());
  },

  /** Saves a plan: updates the trip with this id, or creates one when there is no id or the trip is gone. */
  async save(plan: TripPlan, id: string | null): Promise<TripCard> {
    const init = { headers: { "Content-Type": "application/json" }, body: JSON.stringify(plan) };
    const create = () => send("", { ...init, method: "POST" });
    const update = (tripId: string) =>
      send(`/${encodeURIComponent(tripId)}`, { ...init, method: "PUT" }).catch((caught: unknown) => {
        if (caught instanceof TripsError && caught.status === 404) return create();
        throw caught;
      });
    const response = await (id === null ? create() : update(id));
    const card = parseCard(await response.json());
    if (!card) throw new TripsError("Invalid save response");
    return card;
  },

  /** Changes a trip that is already saved. Unlike `save`, a trip that is gone stays gone. */
  async update(plan: TripPlan, id: string): Promise<TripCard> {
    const response = await send(`/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    });
    const card = parseCard(await response.json());
    if (!card) throw new TripsError("Invalid save response");
    return card;
  },

  async duplicate(id: string, name: string): Promise<TripCard> {
    const response = await send(`/${encodeURIComponent(id)}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const card = parseCard(await response.json());
    if (!card) throw new TripsError("Invalid duplicate response");
    return card;
  },

  async remove(id: string): Promise<void> {
    await send(`/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};
