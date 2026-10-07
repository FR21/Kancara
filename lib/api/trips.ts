import { AGE_GROUPS } from "@/lib/plan-draft";
import {
  type ActiveTrips,
  type HistoryTrips,
  type TripActivity,
  type TripCard,
  type TripCardMember,
  OFFLINE_STATES,
  TRIP_ROLES,
  TRIP_STATUSES,
} from "@/lib/trips/trip";

export type HistoryFilter = { query: string; year: number | null };

export class TripsError extends Error {}

const BASE_URL = "/api/trips";
const REQUEST_TIMEOUT_MS = 15000;

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
    violations: asCount(value.violations),
    offline: OFFLINE_STATES.find((entry) => entry === value.offline),
    day: asCount(value.day),
    nextActivity: parseActivity(value.nextActivity),
    startsIn: asCount(value.startsIn),
    filled: asCount(value.filled),
    cost: parseCost(value.cost),
  };
}

function parseCards(value: unknown): TripCard[] {
  return Array.isArray(value) ? value.flatMap((entry) => parseCard(entry) ?? []) : [];
}

function parseActive(value: unknown): ActiveTrips {
  if (!isRecord(value)) throw new TripsError("Invalid trips response");
  return {
    ongoing: parseCards(value.ongoing),
    upcoming: parseCards(value.upcoming),
    drafts: parseCards(value.drafts),
  };
}

function parseHistory(value: unknown): HistoryTrips {
  if (!isRecord(value)) throw new TripsError("Invalid trips response");
  return {
    trips: parseCards(value.trips),
    total: asCount(value.total) ?? 0,
    countries: asCount(value.countries) ?? 0,
    years: Array.isArray(value.years) ? value.years.flatMap((entry) => asCount(entry) ?? []) : [],
  };
}

async function send(path: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok) throw new TripsError(`Trips request failed with ${response.status}`);
  return response;
}

export const trips = {
  async active(signal: AbortSignal): Promise<ActiveTrips> {
    const response = await send("?tab=active", { method: "GET" }, signal);
    return parseActive(await response.json());
  },

  async history(filter: HistoryFilter, signal: AbortSignal): Promise<HistoryTrips> {
    const params = new URLSearchParams({ tab: "history" });
    if (filter.query.trim() !== "") params.set("q", filter.query.trim());
    if (filter.year !== null) params.set("year", String(filter.year));
    const response = await send(`?${params}`, { method: "GET" }, signal);
    return parseHistory(await response.json());
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
