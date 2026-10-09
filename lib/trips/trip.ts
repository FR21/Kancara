import type { Itinerary } from "@/lib/api/captain";
import {
  type AgeGroup,
  type NeedKey,
  type PassField,
  type PlanDraft,
  hasBudget,
  hasDateError,
  hasDates,
  listCustomNeeds,
  missingFields,
  NEED_KEYS,
  PASS_FIELDS,
} from "@/lib/plan-draft";

export const TRIP_STATES = ["DRAFT", "PLANNED", "COMPLETED"] as const;
export type TripState = (typeof TRIP_STATES)[number];

export const TRIP_ROLES = ["organizer", "member"] as const;
export type TripRole = (typeof TRIP_ROLES)[number];

export const TRIP_STATUSES = ["ongoing", "upcoming", "draft", "completed"] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export const OFFLINE_STATES = ["downloaded", "notDownloaded"] as const;
export type OfflineState = (typeof OFFLINE_STATES)[number];

export type TripActivity = { time: string; title: string };

// A trip as it is stored. Violations, offline, spent, and today come from
// features that are not built yet, so they stay optional and a card hides
// whatever is missing.
export type Trip = {
  id: string;
  name: string;
  state: TripState;
  role: TripRole;
  draft: PlanDraft;
  updatedAt: string;
  countryCodes: string[];
  violations?: number;
  offline?: OfflineState;
  spent?: number;
  today?: TripActivity[];
  itinerary?: Itinerary;
};

export type TripCardMember = { id: string; ageGroup: AgeGroup };

export type TripCard = {
  id: string;
  name: string;
  status: TripStatus;
  role: TripRole;
  origin: string;
  destinations: string[];
  startDate: string;
  endDate: string;
  days: number;
  members: TripCardMember[];
  memberCount: number;
  needs: NeedKey[];
  customNeeds: string[];
  budget: number | null;
  violations?: number;
  offline?: OfflineState;
  day?: number;
  nextActivity?: TripActivity;
  startsIn?: number;
  filled?: number;
  missing?: PassField[];
  cost?: { spent: number; budget: number | null };
};

/** One trip opened up: its card, the plan details behind it, the saved itinerary, and today's date in WIB. */
export type TripPlanView = { card: TripCard; draft: PlanDraft; itinerary: Itinerary | null; today: string };

/** How many needs an itinerary fails to honour, summed over every stop. */
export function countViolations(itinerary: Itinerary): number {
  return itinerary.days
    .flatMap((day) => day.items)
    .reduce((count, item) => count + (item.violations?.length ?? 0), 0);
}

export type ActiveTrips = { ongoing: TripCard[]; upcoming: TripCard[]; drafts: TripCard[] };
export type HistoryTrips = { trips: TripCard[]; total: number; countries: number; years: number[] };

/** The current date (YYYY-MM-DD) and time (HH:MM) where trips are judged, which is WIB. */
export type Clock = { date: string; time: string };

export const MAX_CARD_MEMBERS = 4;
export const DRAFT_SECTIONS = PASS_FIELDS.length;

const DAY_MS = 86_400_000;

function toUtc(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

export function addDays(date: string, days: number): string {
  return new Date(toUtc(date) + days * DAY_MS).toISOString().slice(0, 10);
}

function isDated(draft: PlanDraft): boolean {
  return hasDates(draft) && !hasDateError(draft);
}

const START_TIME = /^\s*(\d{1,2})[:.](\d{2})/;

// What happens today, from the seeded list or from the saved itinerary. An
// itinerary time is free text ("09:00 - 12:00"), so only its start is read.
function activitiesToday(trip: Trip, today: string): TripActivity[] {
  if (trip.today) return trip.today;
  const day = trip.itinerary?.days.find((entry) => entry.date === today);
  if (!day) return [];
  return day.items.flatMap((item) => {
    const match = START_TIME.exec(item.time);
    return match ? [{ time: `${match[1].padStart(2, "0")}:${match[2]}`, title: item.title }] : [];
  });
}

export function tripStatus(trip: Trip, today: string): TripStatus {
  if (trip.state === "DRAFT") return "draft";
  if (trip.state === "COMPLETED") return "completed";
  if (!isDated(trip.draft) || today < trip.draft.startDate) return "upcoming";
  if (today > trip.draft.endDate) return "completed";
  return "ongoing";
}

export function toTripCard(trip: Trip, clock: Clock): TripCard {
  const { draft } = trip;
  const status = tripStatus(trip, clock.date);
  const dated = isDated(draft);
  const card: TripCard = {
    id: trip.id,
    name: trip.name,
    status,
    role: trip.role,
    origin: draft.origin.trim(),
    destinations: draft.destinations,
    startDate: dated ? draft.startDate : "",
    endDate: dated ? draft.endDate : "",
    days: dated ? daysBetween(draft.startDate, draft.endDate) + 1 : 0,
    members: draft.members.slice(0, MAX_CARD_MEMBERS).map((member) => ({ id: member.id, ageGroup: member.ageGroup })),
    memberCount: draft.members.length,
    // Every need anyone in the group has, once each, in the order the plan form lists them.
    needs: NEED_KEYS.filter((need) => draft.members.some((member) => member.needs.includes(need))),
    customNeeds: listCustomNeeds(draft.members),
    budget: hasBudget(draft) ? draft.budget : null,
  };

  if (status === "draft") {
    card.missing = missingFields(draft);
    card.filled = DRAFT_SECTIONS - card.missing.length;
    return card;
  }

  if (trip.violations !== undefined) card.violations = trip.violations;
  if (status === "completed") {
    if (trip.spent !== undefined) card.cost = { spent: trip.spent, budget: draft.budget };
    return card;
  }

  if (trip.offline !== undefined) card.offline = trip.offline;
  if (status === "upcoming" && dated) card.startsIn = daysBetween(clock.date, draft.startDate);
  if (status === "ongoing") {
    card.day = daysBetween(draft.startDate, clock.date) + 1;
    card.nextActivity = activitiesToday(trip, clock.date).find((activity) => activity.time >= clock.time);
  }
  return card;
}

export function tripHref(card: Pick<TripCard, "id" | "status">): string {
  const id = encodeURIComponent(card.id);
  if (card.status === "ongoing") return `/trips/${id}/today`;
  if (card.status === "draft") return `/plan-trip?draft=${id}`;
  if (card.status === "completed") return `/trips/${id}/summary`;
  return `/trips/${id}`;
}
