import { EMPTY_DRAFT, parseDraftPatch, planDraftReducer } from "@/lib/plan-draft";
import { isCountryCode } from "@/lib/travel/countries";
import entries from "./seed.json";
import { type Trip, type TripActivity, addDays, OFFLINE_STATES, TRIP_ROLES, TRIP_STATES } from "./trip";

const DAY_MS = 86_400_000;
const NO_DATES = { startDate: "", endDate: "" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function parseActivity(value: unknown): TripActivity[] {
  if (!isRecord(value) || typeof value.time !== "string" || typeof value.title !== "string") return [];
  return [{ time: value.time, title: value.title }];
}

// Seed dates are offsets from today, so the demo account always has one trip
// in progress, some ahead, and some behind, whatever day it is opened.
function parseEntry(value: unknown, today: string, now: Date): Trip[] {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") return [];
  const state = TRIP_STATES.find((entry) => entry === value.state);
  const role = TRIP_ROLES.find((entry) => entry === value.role);
  if (!state || !role) return [];

  const dates =
    isWholeNumber(value.startOffsetDays) && isWholeNumber(value.days) && value.days > 0
      ? {
          startDate: addDays(today, value.startOffsetDays),
          endDate: addDays(today, value.startOffsetDays + value.days - 1),
        }
      : NO_DATES;
  const draft = planDraftReducer(EMPTY_DRAFT, { type: "patch", patch: parseDraftPatch(value.draft) });
  const updatedDaysAgo = isWholeNumber(value.updatedDaysAgo) ? value.updatedDaysAgo : 0;

  const trip: Trip = {
    id: value.id,
    name: value.name,
    state,
    role,
    draft: { ...draft, ...dates },
    updatedAt: new Date(now.getTime() - updatedDaysAgo * DAY_MS).toISOString(),
    countryCodes: Array.isArray(value.countryCodes) ? value.countryCodes.filter(isCountryCode) : [],
  };
  if (isWholeNumber(value.violations)) trip.violations = value.violations;
  if (isWholeNumber(value.spent)) trip.spent = value.spent;
  const offline = OFFLINE_STATES.find((entry) => entry === value.offline);
  if (offline) trip.offline = offline;
  if (Array.isArray(value.today)) trip.today = value.today.flatMap(parseActivity);
  return [trip];
}

export function seedTrips(today: string, now: Date): Trip[] {
  const list: unknown[] = entries;
  return list.flatMap((entry) => parseEntry(entry, today, now));
}
