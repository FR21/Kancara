import "server-only";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseItinerary } from "@/lib/api/captain";
import { parsePlanDraft } from "@/lib/plan-draft";
import { isCountryCode } from "@/lib/travel/countries";
import { type Trip, type TripActivity, OFFLINE_STATES, TRIP_ROLES, TRIP_STATES } from "./trip";

// Where the stand-in store keeps trips between server restarts. The folder is
// ignored by git. On a host with a read-only disk the write fails and trips
// only last as long as the server process, which is logged once.
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "trips.json");

let writeFailed = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function parseActivity(value: unknown): TripActivity[] {
  if (!isRecord(value) || typeof value.time !== "string" || typeof value.title !== "string") return [];
  return [{ time: value.time, title: value.title }];
}

function parseTrip(value: unknown): Trip[] {
  if (!isRecord(value) || typeof value.id !== "string" || !isRecord(value.draft)) return [];
  const state = TRIP_STATES.find((entry) => entry === value.state);
  const role = TRIP_ROLES.find((entry) => entry === value.role);
  const draft = parsePlanDraft(value.draft);
  if (!state || !role || !draft) return [];

  const trip: Trip = {
    id: value.id,
    name: typeof value.name === "string" ? value.name : "",
    state,
    role,
    // A draft without dates is stored with empty strings; keep them empty
    // instead of the "today" a fresh plan form starts with.
    draft: {
      ...draft,
      startDate: typeof value.draft.startDate === "string" ? value.draft.startDate : "",
      endDate: typeof value.draft.endDate === "string" ? value.draft.endDate : "",
    },
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
    countryCodes: Array.isArray(value.countryCodes) ? value.countryCodes.filter(isCountryCode) : [],
  };
  if (isCount(value.violations)) trip.violations = value.violations;
  if (isCount(value.spent)) trip.spent = value.spent;
  const offline = OFFLINE_STATES.find((entry) => entry === value.offline);
  if (offline) trip.offline = offline;
  if (Array.isArray(value.today)) trip.today = value.today.flatMap(parseActivity);
  try {
    trip.itinerary = parseItinerary(value.itinerary);
  } catch {
    // No itinerary was saved with this trip, or it can no longer be read.
  }
  return [trip];
}

/** Reads every user's saved trips. A missing or unreadable file means nobody has saved anything yet. */
export function loadTrips(): Map<string, Trip[]> {
  const trips = new Map<string, Trip[]>();
  try {
    const stored: unknown = JSON.parse(readFileSync(DATA_FILE, "utf8"));
    if (!isRecord(stored)) return trips;
    Object.entries(stored).forEach(([uid, list]) => {
      if (Array.isArray(list)) trips.set(uid, list.flatMap(parseTrip));
    });
  } catch {
    return trips;
  }
  return trips;
}

/** Writes the given trips to disk, replacing the file in one step so a crash never leaves it half-written. */
export function saveTrips(tripsByUser: Map<string, Trip[]>, keep: (trip: Trip) => boolean): void {
  const stored: Record<string, Trip[]> = {};
  tripsByUser.forEach((trips, uid) => {
    const kept = trips.filter(keep);
    if (kept.length > 0) stored[uid] = kept;
  });

  try {
    mkdirSync(DATA_DIR, { recursive: true });
    const draftFile = `${DATA_FILE}.tmp`;
    writeFileSync(draftFile, JSON.stringify(stored, null, 2));
    renameSync(draftFile, DATA_FILE);
  } catch (caught) {
    if (writeFailed) return;
    writeFailed = true;
    console.error("Trips could not be written to disk; they will be lost when the server restarts.", caught);
  }
}
