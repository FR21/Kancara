import type { Locale } from "@/lib/locale";
import { type DraftPatch, type NeedKey, type PlanDraft, isNeedKey, parseDraftPatch } from "@/lib/plan-draft";
import type { QuestionKey } from "@/lib/plan-questions";
import { sampleCaptain } from "./captain-sample";

export type CaptainReply = { message: string; draftPatch: DraftPatch };

export type ItineraryCover = { need: NeedKey; memberIds: string[] };
export type ItineraryItem = { time: string; title: string; detail: string; covers: ItineraryCover[] };
export type ItineraryDay = { date: string; items: ItineraryItem[] };
export type Itinerary = { days: ItineraryDay[] };

export type Invite = { url: string };

export type ReplyRequest = { story: string; draft: PlanDraft; locale: Locale; focus: QuestionKey | null };
export type PlanRequest = { draft: PlanDraft; locale: Locale };

export interface CaptainClient {
  reply(request: ReplyRequest, signal: AbortSignal): Promise<CaptainReply>;
  itinerary(request: PlanRequest, signal: AbortSignal): Promise<Itinerary>;
  invite(request: PlanRequest, signal: AbortSignal): Promise<Invite>;
}

export class CaptainError extends Error {}

const BASE_URL = process.env.NEXT_PUBLIC_CAPTAIN_API_URL ?? "";
const REQUEST_TIMEOUT_MS = 20000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseReply(value: unknown): CaptainReply {
  if (!isRecord(value) || typeof value.message !== "string") {
    throw new CaptainError("Invalid reply response");
  }
  return { message: value.message, draftPatch: parseDraftPatch(value.draftPatch) };
}

function parseCover(value: unknown): ItineraryCover | null {
  if (!isRecord(value) || !isNeedKey(value.need) || !Array.isArray(value.memberIds)) return null;
  const memberIds = value.memberIds.filter((entry): entry is string => typeof entry === "string");
  return { need: value.need, memberIds };
}

function parseItem(value: unknown): ItineraryItem | null {
  if (!isRecord(value)) return null;
  if (typeof value.time !== "string" || typeof value.title !== "string") return null;
  return {
    time: value.time,
    title: value.title,
    detail: typeof value.detail === "string" ? value.detail : "",
    covers: Array.isArray(value.covers) ? value.covers.flatMap((cover) => parseCover(cover) ?? []) : [],
  };
}

function parseItinerary(value: unknown): Itinerary {
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

function parseInvite(value: unknown): Invite {
  if (!isRecord(value) || typeof value.url !== "string") {
    throw new CaptainError("Invalid invite response");
  }
  return { url: value.url };
}

async function post(path: string, body: unknown, signal: AbortSignal): Promise<unknown> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.any([signal, timeout]),
  });
  if (!response.ok) throw new CaptainError(`Captain request failed with ${response.status}`);
  return response.json();
}

const httpCaptain: CaptainClient = {
  reply: async (request, signal) => parseReply(await post("/captain/reply", request, signal)),
  itinerary: async (request, signal) => parseItinerary(await post("/captain/itinerary", request, signal)),
  invite: async (request, signal) => parseInvite(await post("/captain/invite", request, signal)),
};

export const captainIsSample = BASE_URL === "";

export const captain: CaptainClient = captainIsSample ? sampleCaptain : httpCaptain;
