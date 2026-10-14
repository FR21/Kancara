import { withTimeout } from "@/lib/client/abort";
import type { Locale } from "@/lib/locale";
import {
  type CaptainPackingItem,
  type NeedKey,
  type PlanDraft,
  isNeedKey,
  parseCaptainPacking,
  withoutContacts,
} from "@/lib/plan-draft";
import { type PlaceCategory, isPlaceCategory, safePhotoUrl } from "@/lib/place-category";
import type { Weather } from "@/lib/weather";
import { sampleCaptain } from "@/lib/client/captain-sample";

export type ItineraryCover = { need: NeedKey; memberIds: string[] };
export type ItineraryViolation = { need: NeedKey; reason: string };
/** When a backup is for: rain, a rest, a full restaurant, or the stop being closed or full. */
export const BACKUP_KINDS = ["rain", "rest", "meal", "closed"] as const;
export type BackupKind = (typeof BACKUP_KINDS)[number];
/** A stop that is a chore on the way, not somewhere to visit: handing laundry in, collecting it, or washing. */
export const ERRAND_KINDS = ["laundryDrop", "laundryPick", "wash"] as const;
export type ErrandKind = (typeof ERRAND_KINDS)[number];
type ItineraryPlace = {
  title: string;
  detail: string;
  imageUrl?: string;
  address?: string;
  rating?: number;
  priceLevel?: string;
  openingHours?: string;
  /** Google's id for the place: the one place detail stored for good, so the map can find the stop again. */
  placeId?: string;
  category?: PlaceCategory;
  covers: ItineraryCover[];
  violations?: ItineraryViolation[];
};
/** A place ready to take a stop's slot. Kind "main" is what the slot held before a backup stood in for it. */
export type ItineraryBackup = ItineraryPlace & { kind: BackupKind | "main" };
export type ItineraryItem = ItineraryPlace & {
  time: string;
  travelToNext?: { distance: string; duration: string };
  backups?: ItineraryBackup[];
  /** Set while a backup stands in this slot: the kind of backup it is. */
  standIn?: BackupKind;
  /** Set on a stop the group's laundry choice put there, so it can be taken off again when the choice changes. */
  errand?: ErrandKind;
};
export type ItineraryDay = { date: string; items: ItineraryItem[] };
export type Itinerary = { days: ItineraryDay[] };

export type PlanRequest = { draft: PlanDraft; locale: Locale };
/** `known` names what is on the packing list already, so Captain adds to it instead of repeating it. */
export type PackingRequest = PlanRequest & { itinerary: Itinerary | null; weather: Weather | null; known: string[] };

export interface CaptainClient {
  itinerary(request: PlanRequest, signal: AbortSignal): Promise<Itinerary>;
  packing(request: PackingRequest, signal: AbortSignal): Promise<CaptainPackingItem[]>;
}

export class CaptainError extends Error {}

const BASE_URL = process.env.NEXT_PUBLIC_CAPTAIN_API_URL ?? "";
const MAX_BACKUPS = 4;
const REQUEST_TIMEOUT_MS = 60000;
const RATE_LIMIT_WAIT_MS = 1100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseCover(value: unknown): ItineraryCover | null {
  if (!isRecord(value) || !isNeedKey(value.need) || !Array.isArray(value.memberIds)) return null;
  const memberIds = value.memberIds.filter((entry): entry is string => typeof entry === "string");
  return { need: value.need, memberIds };
}

function parseViolation(value: unknown): ItineraryViolation | null {
  if (!isRecord(value) || !isNeedKey(value.need) || typeof value.reason !== "string") return null;
  return { need: value.need, reason: value.reason };
}

function parsePlace(value: Record<string, unknown>, title: string): ItineraryPlace {
  return {
    title,
    detail: typeof value.detail === "string" ? value.detail : "",
    imageUrl: safePhotoUrl(value.imageUrl),
    address: typeof value.address === "string" ? value.address : undefined,
    rating: typeof value.rating === "number" ? value.rating : undefined,
    priceLevel: typeof value.priceLevel === "string" ? value.priceLevel : undefined,
    openingHours: typeof value.openingHours === "string" ? value.openingHours : undefined,
    placeId: typeof value.placeId === "string" && value.placeId !== "" ? value.placeId : undefined,
    category: isPlaceCategory(value.category) ? value.category : undefined,
    covers: Array.isArray(value.covers) ? value.covers.flatMap((cover) => parseCover(cover) ?? []) : [],
    violations: Array.isArray(value.violations) ? value.violations.flatMap((violation) => parseViolation(violation) ?? []) : [],
  };
}

const isBackupKind = (value: unknown): value is BackupKind => BACKUP_KINDS.some((kind) => kind === value);

function parseBackup(value: unknown): ItineraryBackup | null {
  if (!isRecord(value) || typeof value.title !== "string" || value.title.trim() === "") return null;
  if (value.kind !== "main" && !isBackupKind(value.kind)) return null;
  return { ...parsePlace(value, value.title), kind: value.kind };
}

function parseItem(value: unknown): ItineraryItem | null {
  if (!isRecord(value)) return null;
  if (typeof value.time !== "string" || typeof value.title !== "string") return null;
  const errand = ERRAND_KINDS.find((kind) => kind === value.errand);
  const backups = Array.isArray(value.backups)
    ? value.backups.flatMap((backup) => parseBackup(backup) ?? []).slice(0, MAX_BACKUPS)
    : [];
  return {
    ...parsePlace(value, value.title),
    time: value.time,
    travelToNext: isRecord(value.travelToNext) && typeof value.travelToNext.distance === "string" && typeof value.travelToNext.duration === "string" ? { distance: value.travelToNext.distance, duration: value.travelToNext.duration } : undefined,
    ...(backups.length > 0 ? { backups } : {}),
    ...(isBackupKind(value.standIn) ? { standIn: value.standIn } : {}),
    ...(errand ? { errand } : {}),
  };
}

export function parseItinerary(value: unknown): Itinerary {
  if (!isRecord(value) || !Array.isArray(value.days)) {
    throw new CaptainError("Invalid itinerary response");
  }
  const days = value.days.flatMap((day): ItineraryDay[] => {
    if (!isRecord(day) || typeof day.date !== "string" || !Array.isArray(day.items)) return [];
    const items = day.items.flatMap((item) => parseItem(item) ?? []);
    return [{ date: day.date, items }];
  });
  if (days.length === 0) throw new CaptainError("Empty itinerary response");
  return { days };
}

// Captain's items arrive unnamed; each gets an id here so its tick can be remembered.
function parsePacking(value: unknown): CaptainPackingItem[] {
  if (!isRecord(value) || !Array.isArray(value.items)) throw new CaptainError("Invalid packing response");
  return parseCaptainPacking(
    value.items.map((item) => (isRecord(item) ? { ...item, id: `captain:${crypto.randomUUID()}` } : item)),
  );
}

async function post(path: string, body: unknown, signal: AbortSignal, retried = false): Promise<unknown> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: withTimeout(signal, REQUEST_TIMEOUT_MS),
  });
  // Every API allows three requests a second; one busy moment is waited out, not shown as a failure.
  if (response.status === 429 && !retried) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
    return post(path, body, signal, true);
  }
  if (!response.ok) throw new CaptainError(`Captain request failed with ${response.status}`);
  return response.json();
}

const httpCaptain: CaptainClient = {
  itinerary: async (request, signal) =>
    parseItinerary(await post("/captain/itinerary", { ...request, draft: withoutContacts(request.draft) }, signal)),
  packing: async (request, signal) =>
    parsePacking(await post("/captain/packing", { ...request, draft: withoutContacts(request.draft) }, signal)),
};

export const captainIsSample = BASE_URL === "";

export const captain: CaptainClient = captainIsSample ? sampleCaptain : httpCaptain;
