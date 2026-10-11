import "server-only";
import { Prisma, type Trip as TripRecord } from "@prisma/client";
import type { Viewer } from "@/lib/account";
import { type Itinerary, parseItinerary } from "@/lib/api/captain";
import { type PlanDraft, EMPTY_DRAFT, hasDateError, hasDates, parsePlanDraft } from "@/lib/plan-draft";
import { prisma } from "@/lib/prisma";
import {
  type ActiveTrips,
  type Clock,
  type HistoryTrips,
  type Trip,
  type TripActivity,
  type TripCard,
  type TripPlanView,
  OFFLINE_STATES,
  toTripCard,
  TRIP_ROLES,
  TRIP_STATES,
} from "./trip";

export type HistoryFilter = { query: string; year: number | null };
export type Page = { limit: number; offset: number };
export type DeleteResult = "deleted" | "notFound";
/** A finished plan to keep. `violations` is left out when the plan was never checked against the group's needs. */
export type TripInput = { name: string; draft: PlanDraft; violations?: number; itinerary?: Itinerary };

// Every query here is limited to the viewer's workspace and skips rows that were deleted. Lists are paged in the
// database: a page of identifiers is picked in the order the screen shows them, then those rows are read at once.

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
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND = "P2025";

/** Times are stored in UTC. Which day it is, and so which trips are under way, is judged in WIB. */
function readClock(now: Date): Clock {
  return { date: DATE_FORMAT.format(now), time: TIME_FORMAT.format(now) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readActivities(value: unknown): TripActivity[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((entry) =>
    isRecord(entry) && typeof entry.time === "string" && typeof entry.title === "string"
      ? [{ time: entry.time, title: entry.title }]
      : [],
  );
}

function readItinerary(value: unknown): Itinerary | undefined {
  try {
    return parseItinerary(value);
  } catch {
    return undefined;
  }
}

// The plan document goes through the same parser as a plan arriving from the browser, so a trip saved by an
// older version of the app still has every field the screens read.
function toTrip(record: TripRecord): Trip {
  const stored = isRecord(record.planDraft) ? record.planDraft : {};
  const draft = parsePlanDraft(stored) ?? EMPTY_DRAFT;
  return {
    id: record.tripId,
    name: record.name,
    state: TRIP_STATES.find((state) => state === record.state) ?? "DRAFT",
    role: TRIP_ROLES.find((role) => role === record.role) ?? "member",
    // A plan without dates is stored with empty strings; they stay empty instead of the "today" a new plan starts with.
    draft: {
      ...draft,
      startDate: typeof stored.startDate === "string" ? stored.startDate : "",
      endDate: typeof stored.endDate === "string" ? stored.endDate : "",
    },
    updatedAt: record.updatedAt.toISOString(),
    countryCodes: record.countryCodes,
    violations: record.violationCount ?? undefined,
    offline: OFFLINE_STATES.find((state) => state === record.offlineState),
    spent: record.spentRupiah === null ? undefined : Number(record.spentRupiah),
    today: readActivities(record.todayActivities),
    itinerary: readItinerary(record.itinerary),
  };
}

function toDate(day: string): Date | null {
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The columns lists filter and sort on, taken from the plan so the two can never disagree. */
function columnsOf(draft: PlanDraft) {
  const dated = hasDates(draft) && !hasDateError(draft);
  const startDate = dated ? toDate(draft.startDate) : null;
  const endDate = dated ? toDate(draft.endDate) : null;
  return {
    origin: draft.origin.trim(),
    destinations: draft.destinations,
    startDate: startDate && endDate ? startDate : null,
    endDate: startDate && endDate ? endDate : null,
    planDraft: draft as unknown as Prisma.InputJsonValue,
  };
}

/** The rows for a page of identifiers, in the order the identifiers came in. */
async function readInOrder(viewer: Viewer, ids: string[]): Promise<Trip[]> {
  if (ids.length === 0) return [];
  const records = await prisma.trip.findMany({
    where: { tripId: { in: ids }, workspaceId: viewer.workspaceId, deletedAt: null },
  });
  const byId = new Map(records.map((record) => [record.tripId, toTrip(record)]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

// One more row than the page is asked for; when it comes back there is a next page.
function nextOffsetOf(found: number, page: Page): number | null {
  return found > page.limit ? page.offset + page.limit : null;
}

const finished = (today: string) =>
  Prisma.sql`("state" = 'COMPLETED' OR ("state" = 'PLANNED' AND "end_date" < ${today}::date))`;

/** Trips that are not over: under way first, then the ones ahead by start date, then drafts by last change. */
export async function listActiveTrips(viewer: Viewer, page: Page): Promise<ActiveTrips> {
  const clock = readClock(new Date());
  const rows = await prisma.$queryRaw<{ trip_id: string }[]>`
    SELECT "trip_id"
    FROM "trips"
    WHERE "workspace_id" = ${viewer.workspaceId}::uuid
      AND "deleted_at" IS NULL
      AND ("state" = 'DRAFT' OR ("state" = 'PLANNED' AND ("start_date" IS NULL OR "end_date" >= ${clock.date}::date)))
    ORDER BY
      CASE
        WHEN "state" = 'DRAFT' THEN 2
        WHEN "start_date" IS NULL OR "start_date" > ${clock.date}::date THEN 1
        ELSE 0
      END,
      CASE WHEN "state" = 'DRAFT' THEN NULL ELSE "start_date" END ASC NULLS LAST,
      "updated_at" DESC,
      "trip_id"
    LIMIT ${page.limit + 1} OFFSET ${page.offset}`;

  const trips = await readInOrder(
    viewer,
    rows.slice(0, page.limit).map((row) => row.trip_id),
  );
  const cards = trips.map((trip) => toTripCard(trip, clock));
  return {
    ongoing: cards.filter((card) => card.status === "ongoing"),
    upcoming: cards.filter((card) => card.status === "upcoming"),
    drafts: cards.filter((card) => card.status === "draft"),
    nextOffset: nextOffsetOf(rows.length, page),
  };
}

/** Finished trips, newest first, with totals that cover all of them and not just the page or the filter. */
export async function listHistoryTrips(viewer: Viewer, filter: HistoryFilter, page: Page): Promise<HistoryTrips> {
  const clock = readClock(new Date());
  const mine = Prisma.sql`"workspace_id" = ${viewer.workspaceId}::uuid AND "deleted_at" IS NULL AND ${finished(clock.date)}`;
  const endedOn = Prisma.sql`coalesce("end_date", ("updated_at" AT TIME ZONE 'UTC')::date)`;
  const needle = `%${filter.query.trim().replace(/[\\%_]/g, "\\$&")}%`;
  const matchesYear =
    filter.year === null ? Prisma.sql`TRUE` : Prisma.sql`extract(year FROM ${endedOn}) = ${filter.year}`;
  const matchesQuery =
    filter.query.trim() === ""
      ? Prisma.sql`TRUE`
      : Prisma.sql`("name" ILIKE ${needle} OR "origin" ILIKE ${needle} OR EXISTS (
          SELECT 1 FROM unnest("destinations") AS destination WHERE destination ILIKE ${needle}
        ))`;

  const [rows, totals] = await Promise.all([
    prisma.$queryRaw<{ trip_id: string }[]>`
      SELECT "trip_id"
      FROM "trips"
      WHERE ${mine} AND ${matchesYear} AND ${matchesQuery}
      ORDER BY ${endedOn} DESC, "trip_id"
      LIMIT ${page.limit + 1} OFFSET ${page.offset}`,
    prisma.$queryRaw<{ total: number; countries: number; years: number[] | null }[]>`
      SELECT
        count(*)::int AS "total",
        (SELECT count(DISTINCT code)::int FROM "trips", unnest("country_codes") AS code WHERE ${mine}) AS "countries",
        array_agg(DISTINCT extract(year FROM ${endedOn})::int) AS "years"
      FROM "trips"
      WHERE ${mine}`,
  ]);

  const trips = await readInOrder(
    viewer,
    rows.slice(0, page.limit).map((row) => row.trip_id),
  );
  return {
    trips: trips.map((trip) => toTripCard(trip, clock)),
    total: totals[0]?.total ?? 0,
    countries: totals[0]?.countries ?? 0,
    years: [...(totals[0]?.years ?? [])].sort((first, second) => second - first),
    nextOffset: nextOffsetOf(rows.length, page),
  };
}

/** A trip the viewer can see, with its itinerary when one was saved. Null when there is no such trip. */
export async function getTripPlan(viewer: Viewer, id: string): Promise<TripPlanView | null> {
  if (!UUID.test(id)) return null;
  const record = await prisma.trip.findFirst({
    where: { tripId: id, workspaceId: viewer.workspaceId, deletedAt: null },
  });
  if (!record) return null;

  const trip = toTrip(record);
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
  const created = await prisma.trip.create({
    data: {
      workspaceId: viewer.workspaceId,
      userId: viewer.userId,
      name: input.name,
      state: "PLANNED",
      role: "organizer",
      ...columnsOf(input.draft),
      itinerary: input.itinerary as unknown as Prisma.InputJsonValue | undefined,
      violationCount: input.violations,
    },
  });
  return toTripCard(toTrip(created), readClock(new Date()));
}

/** Replaces a saved trip's plan, for example after it is generated again. Null when the viewer cannot change it. */
export async function updateTrip(viewer: Viewer, id: string, input: TripInput): Promise<TripCard | null> {
  if (!UUID.test(id)) return null;
  try {
    const updated = await prisma.trip.update({
      where: { tripId: id, workspaceId: viewer.workspaceId, deletedAt: null },
      data: {
        name: input.name,
        ...columnsOf(input.draft),
        itinerary: (input.itinerary as unknown as Prisma.InputJsonValue | undefined) ?? Prisma.DbNull,
        violationCount: input.violations ?? null,
      },
    });
    return toTripCard(toTrip(updated), readClock(new Date()));
  } catch (caught) {
    if (caught instanceof Prisma.PrismaClientKnownRequestError && caught.code === NOT_FOUND) return null;
    throw caught;
  }
}

/** Copies a trip into a new draft the viewer organizes: same members, needs, and settings, no dates. */
export async function duplicateTrip(viewer: Viewer, id: string, name: string): Promise<TripCard | null> {
  if (!UUID.test(id)) return null;
  // Reading the original and writing the copy happen in one transaction, so the copy is never made of half a trip.
  const created = await prisma.$transaction(async (transaction) => {
    const source = await transaction.trip.findFirst({
      where: { tripId: id, workspaceId: viewer.workspaceId, deletedAt: null },
    });
    if (!source) return null;

    const { draft, countryCodes } = toTrip(source);
    return transaction.trip.create({
      data: {
        workspaceId: viewer.workspaceId,
        userId: viewer.userId,
        name,
        state: "DRAFT",
        role: "organizer",
        countryCodes,
        ...columnsOf({
          ...draft,
          startDate: "",
          endDate: "",
          notes: "",
          members: draft.members.map((member) => ({ ...member, id: crypto.randomUUID() })),
        }),
      },
    });
  });
  return created ? toTripCard(toTrip(created), readClock(new Date())) : null;
}

/** Deleting a trip hides it: the row stays, marked with the time it was deleted. */
export async function deleteTrip(viewer: Viewer, id: string): Promise<DeleteResult> {
  if (!UUID.test(id)) return "notFound";
  const { count } = await prisma.trip.updateMany({
    where: { tripId: id, workspaceId: viewer.workspaceId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return count === 0 ? "notFound" : "deleted";
}
