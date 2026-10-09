import "server-only";
import type { Itinerary } from "@/lib/api/captain";
import { verifySession } from "@/lib/auth/session";
import type { PlanDraft } from "@/lib/plan-draft";
import { seedTrips } from "./seed";
import {
  type ActiveTrips,
  type Clock,
  type HistoryTrips,
  type Trip,
  type TripCard,
  type TripPlanView,
  toTripCard,
} from "./trip";

export type Viewer = { uid: string; email: string | null };
export type HistoryFilter = { query: string; year: number | null };
export type DeleteResult = "deleted" | "notFound" | "forbidden";
/** A finished plan to keep. `violations` is left out when the plan was never checked against the group's needs. */
export type TripInput = { name: string; draft: PlanDraft; violations?: number; itinerary?: Itinerary };

// Stand-in for the trips database: one list per signed-in user, kept in memory
// and lost when the server restarts. It hangs off globalThis so a hot reload in
// development keeps it. Replace the functions below with real queries; the API
// routes and the page only use what this file exports.
type TripsGlobal = typeof globalThis & { kancaraTrips?: Map<string, Trip[]> };
const globalStore = globalThis as TripsGlobal;
const tripsByUser = (globalStore.kancaraTrips ??= new Map<string, Trip[]>());

const TIME_ZONE = "Asia/Jakarta";
const DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function readClock(now: Date): Clock {
  return { date: DATE_FORMAT.format(now), time: TIME_FORMAT.format(now) };
}

// Sample trips are only ever given to the accounts listed in
// DEMO_ACCOUNT_EMAILS (comma separated). Every other account starts empty.
function isDemoAccount(email: string | null): boolean {
  if (!email) return false;
  const demoEmails = (process.env.DEMO_ACCOUNT_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return demoEmails.includes(email.toLowerCase());
}

function tripsOf(viewer: Viewer): Trip[] {
  const existing = tripsByUser.get(viewer.uid);
  if (existing) return existing;
  const now = new Date();
  const created = isDemoAccount(viewer.email) ? seedTrips(readClock(now).date, now) : [];
  tripsByUser.set(viewer.uid, created);
  return created;
}

export async function currentViewer(): Promise<Viewer | null> {
  const session = await verifySession();
  if (!session) return null;
  return { uid: session.uid, email: session.email ?? null };
}

function byStartDate(first: TripCard, second: TripCard): number {
  if (first.startDate === second.startDate) return 0;
  if (first.startDate === "") return 1;
  if (second.startDate === "") return -1;
  return first.startDate < second.startDate ? -1 : 1;
}

export function listActiveTrips(viewer: Viewer): ActiveTrips {
  const clock = readClock(new Date());
  const trips = tripsOf(viewer);
  const cards = trips.map((trip) => toTripCard(trip, clock));
  const updatedAt = new Map(trips.map((trip) => [trip.id, trip.updatedAt]));
  const lastChanged = (card: TripCard) => updatedAt.get(card.id) ?? "";

  return {
    ongoing: cards.filter((card) => card.status === "ongoing").sort(byStartDate),
    upcoming: cards.filter((card) => card.status === "upcoming").sort(byStartDate),
    drafts: cards
      .filter((card) => card.status === "draft")
      .sort((first, second) => lastChanged(second).localeCompare(lastChanged(first))),
  };
}

export function listHistoryTrips(viewer: Viewer, filter: HistoryFilter): HistoryTrips {
  const clock = readClock(new Date());
  const finished = tripsOf(viewer)
    .map((trip) => ({ trip, card: toTripCard(trip, clock) }))
    .filter(({ card }) => card.status === "completed")
    .map(({ trip, card }) => ({ trip, card, endedOn: card.endDate || trip.updatedAt.slice(0, 10) }))
    .sort((first, second) => second.endedOn.localeCompare(first.endedOn));

  const yearOf = (endedOn: string) => Number(endedOn.slice(0, 4));
  const needle = filter.query.trim().toLowerCase();
  const matches = finished.filter(({ card, endedOn }) => {
    if (filter.year !== null && yearOf(endedOn) !== filter.year) return false;
    if (needle === "") return true;
    return [card.name, card.origin, ...card.destinations].some((entry) => entry.toLowerCase().includes(needle));
  });

  return {
    trips: matches.map(({ card }) => card),
    total: finished.length,
    countries: new Set(finished.flatMap(({ trip }) => trip.countryCodes)).size,
    years: [...new Set(finished.map(({ endedOn }) => yearOf(endedOn)))],
  };
}

/** A trip the viewer can see, with its itinerary when one was saved. Null when there is no such trip. */
export function getTripPlan(viewer: Viewer, id: string): TripPlanView | null {
  const trip = tripsOf(viewer).find((entry) => entry.id === id);
  if (!trip) return null;
  const clock = readClock(new Date());
  return {
    card: toTripCard(trip, clock),
    draft: trip.draft,
    itinerary: trip.itinerary ?? null,
    today: clock.date,
  };
}

function withPlan(trip: Trip, input: TripInput, now: Date): Trip {
  const next: Trip = { ...trip, name: input.name, draft: input.draft, updatedAt: now.toISOString() };
  delete next.violations;
  delete next.itinerary;
  if (input.violations !== undefined) next.violations = input.violations;
  if (input.itinerary !== undefined) next.itinerary = input.itinerary;
  return next;
}

/** Saves a finished plan as a trip the viewer organizes. */
export function createTrip(viewer: Viewer, input: TripInput): TripCard {
  const now = new Date();
  const blank: Trip = {
    id: crypto.randomUUID(),
    name: "",
    state: "PLANNED",
    role: "organizer",
    draft: input.draft,
    updatedAt: "",
    countryCodes: [],
  };
  const trip = withPlan(blank, input, now);
  tripsOf(viewer).push(trip);
  return toTripCard(trip, readClock(now));
}

/** Replaces a saved trip's plan, for example after it is generated again. Null when the viewer cannot change it. */
export function updateTrip(viewer: Viewer, id: string, input: TripInput): TripCard | null {
  const trips = tripsOf(viewer);
  const index = trips.findIndex((trip) => trip.id === id);
  if (index === -1 || trips[index].role !== "organizer") return null;
  const now = new Date();
  trips[index] = withPlan(trips[index], input, now);
  return toTripCard(trips[index], readClock(now));
}

/** Copies a trip into a new draft the viewer organizes: same members, needs, and settings, no dates. */
export function duplicateTrip(viewer: Viewer, id: string, name: string): TripCard | null {
  const trips = tripsOf(viewer);
  const source = trips.find((trip) => trip.id === id);
  if (!source) return null;

  const draft = structuredClone(source.draft);
  const now = new Date();
  const copy: Trip = {
    id: crypto.randomUUID(),
    name,
    state: "DRAFT",
    role: "organizer",
    draft: {
      ...draft,
      startDate: "",
      endDate: "",
      notes: "",
      members: draft.members.map((member) => ({ ...member, id: crypto.randomUUID() })),
    },
    updatedAt: now.toISOString(),
    countryCodes: [...source.countryCodes],
  };
  trips.push(copy);
  return toTripCard(copy, readClock(now));
}

export function deleteTrip(viewer: Viewer, id: string): DeleteResult {
  const trips = tripsOf(viewer);
  const index = trips.findIndex((trip) => trip.id === id);
  if (index === -1) return "notFound";
  if (trips[index].role !== "organizer") return "forbidden";
  trips.splice(index, 1);
  return "deleted";
}
