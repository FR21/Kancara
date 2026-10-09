import "server-only";
import type { Itinerary } from "@/lib/api/captain";
import { verifySession } from "@/lib/auth/session";
import type { PlanDraft } from "@/lib/plan-draft";
import { prisma } from "@/lib/prisma";
import { isSeedTrip, seedTrips } from "./seed";
import {
  type ActiveTrips,
  type Clock,
  type HistoryTrips,
  type Trip,
  type TripCard,
  type TripPlanView,
  type TripRole,
  type TripState,
  type OfflineState,
  type TripActivity,
  toTripCard,
} from "./trip";

export type Viewer = { uid: string; email: string | null };
export type HistoryFilter = { query: string; year: number | null };
export type DeleteResult = "deleted" | "notFound" | "forbidden";
/** A finished plan to keep. `violations` is left out when the plan was never checked against the group's needs. */
export type TripInput = { name: string; draft: PlanDraft; violations?: number; itinerary?: Itinerary };

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

function isDemoAccount(email: string | null): boolean {
  if (!email) return false;
  const demoEmails = (process.env.DEMO_ACCOUNT_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return demoEmails.includes(email.toLowerCase());
}

async function ensureUser(viewer: Viewer) {
  return prisma.user.upsert({
    where: { id: viewer.uid },
    update: { email: viewer.email },
    create: { id: viewer.uid, email: viewer.email },
  });
}

// Map Prisma record ke domain Trip
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromDbTrip(record: any): Trip {
  return {
    id: record.id,
    name: record.name,
    state: record.state as TripState,
    role: record.role as TripRole,
    draft: record.draft as unknown as PlanDraft,
    updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : String(record.updatedAt),
    countryCodes: record.countryCodes ?? [],
    violations: record.violations ?? undefined,
    offline: (record.offline as OfflineState) ?? undefined,
    spent: record.spent ?? undefined,
    today: (record.today as TripActivity[]) ?? undefined,
    itinerary: (record.itinerary as Itinerary) ?? undefined,
  };
}

async function fetchTripsOf(viewer: Viewer): Promise<Trip[]> {
  await ensureUser(viewer);
  const records = await prisma.trip.findMany({
    where: { userId: viewer.uid },
    orderBy: { updatedAt: "desc" },
  });

  const trips = records.map(fromDbTrip);

  if (isDemoAccount(viewer.email)) {
    const now = new Date();
    const clock = readClock(now);
    const hasAnySeed = trips.some(isSeedTrip);
    if (!hasAnySeed) {
      const generated = seedTrips(clock.date, now);
      return [...trips, ...generated];
    }
  }

  return trips;
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

export async function listActiveTrips(viewer: Viewer): Promise<ActiveTrips> {
  const clock = readClock(new Date());
  const trips = await fetchTripsOf(viewer);
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

export async function listHistoryTrips(viewer: Viewer, filter: HistoryFilter): Promise<HistoryTrips> {
  const clock = readClock(new Date());
  const trips = await fetchTripsOf(viewer);
  const finished = trips
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
export async function getTripPlan(viewer: Viewer, id: string): Promise<TripPlanView | null> {
  if (isDemoAccount(viewer.email)) {
    const clock = readClock(new Date());
    const demoTrip = seedTrips(clock.date, new Date()).find((t) => t.id === id);
    if (demoTrip) {
      return {
        card: toTripCard(demoTrip, clock),
        draft: demoTrip.draft,
        itinerary: demoTrip.itinerary ?? null,
        today: clock.date,
      };
    }
  }

  const record = await prisma.trip.findFirst({
    where: { id, userId: viewer.uid },
  });
  if (!record) return null;

  const trip = fromDbTrip(record);
  const clock = readClock(new Date());
  return {
    card: toTripCard(trip, clock),
    draft: trip.draft,
    itinerary: trip.itinerary ?? null,
    today: clock.date,
  };
}

/** Saves a finished plan as a trip the viewer organizes. */
export async function createTrip(viewer: Viewer, input: TripInput): Promise<TripCard> {
  await ensureUser(viewer);
  const now = new Date();

  const created = await prisma.trip.create({
    data: {
      userId: viewer.uid,
      name: input.name,
      state: "PLANNED",
      role: "organizer",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draft: input.draft as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      itinerary: (input.itinerary ?? null) as any,
      violations: input.violations,
      countryCodes: [],
    },
  });

  const trip = fromDbTrip(created);
  return toTripCard(trip, readClock(now));
}

/** Replaces a saved trip's plan, for example after it is generated again. Null when the viewer cannot change it. */
export async function updateTrip(viewer: Viewer, id: string, input: TripInput): Promise<TripCard | null> {
  await ensureUser(viewer);

  const existing = await prisma.trip.findFirst({
    where: { id, userId: viewer.uid },
  });
  if (!existing || existing.role !== "organizer") return null;

  const updated = await prisma.trip.update({
    where: { id },
    data: {
      name: input.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      draft: input.draft as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      itinerary: (input.itinerary ?? null) as any,
      violations: input.violations ?? null,
      updatedAt: new Date(),
    },
  });

  const trip = fromDbTrip(updated);
  return toTripCard(trip, readClock(new Date()));
}

/** Copies a trip into a new draft the viewer organizes: same members, needs, and settings, no dates. */
export async function duplicateTrip(viewer: Viewer, id: string, name: string): Promise<TripCard | null> {
  await ensureUser(viewer);

  const sourceRecord = await prisma.trip.findFirst({
    where: { id, userId: viewer.uid },
  });
  if (!sourceRecord) return null;

  const source = fromDbTrip(sourceRecord);
  const draft = structuredClone(source.draft);
  const now = new Date();

  const created = await prisma.trip.create({
    data: {
      userId: viewer.uid,
      name,
      state: "DRAFT",
      role: "organizer",
      draft: {
        ...draft,
        startDate: "",
        endDate: "",
        notes: "",
        members: draft.members.map((member) => ({ ...member, id: crypto.randomUUID() })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      countryCodes: source.countryCodes,
    },
  });

  const copy = fromDbTrip(created);
  return toTripCard(copy, readClock(now));
}

export async function deleteTrip(viewer: Viewer, id: string): Promise<DeleteResult> {
  const existing = await prisma.trip.findFirst({
    where: { id, userId: viewer.uid },
  });
  if (!existing) return "notFound";
  if (existing.role !== "organizer") return "forbidden";

  await prisma.trip.delete({
    where: { id },
  });
  return "deleted";
}
