import { withTimeout } from "@/lib/client/abort";
import type { AgeGroup } from "@/lib/plan-draft";
import { AGE_GROUPS } from "@/lib/plan-draft";
import { type SafetyAction, readSafetyAction } from "@/lib/safety/action";
import { type HelpLanguage, isHelpLanguage } from "@/lib/safety/help-phrases";
import { readLocalNow } from "@/lib/safety/use-local-now";
import {
  type ReportSource,
  type ReportStatus,
  type SafetyPack,
  openReportFor,
  parseSafetyPack,
  REPORT_SOURCES,
  REPORT_STATUSES,
} from "@/lib/safety/safety-pack";

export class SafetyError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
  }
}

/** How a phone reaches a trip's pack: signed in to an account on the trip, or holding one member's own link. */
export type Door = { kind: "trip"; tripId: string } | { kind: "link"; token: string };

const REQUEST_TIMEOUT_MS = 15000;
const RATE_LIMIT_WAIT_MS = 1100;
const PACK_PREFIX = "kancara-safety-pack:";
const QUEUE_PREFIX = "kancara-safety-queue:";
// What can be done without a connection and sent later: asking for help and answering. Settings need the server.
const QUEUEABLE: SafetyAction["type"][] = ["report", "status", "lost", "location"];

async function send(path: string, init: RequestInit, signal?: AbortSignal, retried = false): Promise<Response> {
  const response = await fetch(path, { ...init, signal: withTimeout(signal, REQUEST_TIMEOUT_MS) });
  // Every API allows three requests a second; one busy moment is waited out, not shown as a failure.
  if (response.status === 429 && !retried) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
    return send(path, init, signal, true);
  }
  if (!response.ok) throw new SafetyError(`Request failed with ${response.status}`, response.status);
  return response;
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function readStored(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the page works for as long as it stays open.
  }
}

const pathOf = (door: Door) =>
  door.kind === "trip" ? `/api/trips/${encodeURIComponent(door.tripId)}/safety` : `/api/help/${encodeURIComponent(door.token)}`;
// What is kept on the phone is kept per door: the same trip reads differently for an account and for a link.
const keyOf = (door: Door) => (door.kind === "trip" ? door.tripId : door.token);

/** The pack as last fetched on this phone, which is what the help page shows without a connection. */
export function readKeptPack(door: Door): SafetyPack | null {
  return parseSafetyPack(readStored(PACK_PREFIX + keyOf(door)));
}

async function readPack(door: Door, response: Response): Promise<SafetyPack> {
  const pack = parseSafetyPack(await response.json());
  if (!pack) throw new SafetyError("Invalid safety pack");
  store(PACK_PREFIX + keyOf(door), pack);
  return pack;
}

export async function fetchPack(door: Door, signal?: AbortSignal): Promise<SafetyPack> {
  return readPack(door, await send(pathOf(door), { method: "GET" }, signal));
}

export async function sendAction(door: Door, action: SafetyAction): Promise<SafetyPack> {
  return readPack(door, await send(pathOf(door), post(action)));
}

const SEEN_PREFIX = "kancara-safety-seen:";
const MAX_SEEN = 50;

/** The finished searches this phone has already said were over, so each is announced once and never again. */
export function readSeenReports(door: Door): { has: (id: string) => boolean; mark: (ids: string[]) => void } {
  const stored = readStored(SEEN_PREFIX + keyOf(door));
  const seen = Array.isArray(stored) ? stored.filter((entry): entry is string => typeof entry === "string") : [];
  return {
    has: (id) => seen.includes(id),
    mark: (ids) => store(SEEN_PREFIX + keyOf(door), [...seen, ...ids].slice(-MAX_SEEN)),
  };
}

export function canQueue(action: SafetyAction): boolean {
  return QUEUEABLE.includes(action.type);
}

/** Actions taken on this phone that have not reached the server yet, oldest first. */
export function readQueue(door: Door): SafetyAction[] {
  const stored = readStored(QUEUE_PREFIX + keyOf(door));
  return Array.isArray(stored) ? stored.flatMap((entry) => readSafetyAction(entry) ?? []) : [];
}

export function queueAction(door: Door, action: SafetyAction) {
  store(QUEUE_PREFIX + keyOf(door), [...readQueue(door), action]);
}

/**
 * Sends the waiting actions in the order they were taken. It stops at the first one that cannot get through and
 * keeps it with the rest; one the server refuses is dropped, since sending it again would not change the answer.
 */
export async function flushQueue(door: Door): Promise<SafetyPack | null> {
  let pack: SafetyPack | null = null;
  let waiting = readQueue(door);
  while (waiting.length > 0) {
    try {
      pack = await sendAction(door, waiting[0]);
    } catch (caught) {
      if (!(caught instanceof SafetyError) || caught.status === 0 || caught.status >= 500) break;
    }
    waiting = waiting.slice(1);
    store(QUEUE_PREFIX + keyOf(door), waiting);
  }
  return pack;
}

/** The pack as it will read once a waiting action has been sent, so the screen answers at once. */
export function applyLocally(pack: SafetyPack, action: SafetyAction): SafetyPack {
  const now = new Date().toISOString();
  if (action.type === "report") {
    if (openReportFor(pack, action.memberId)) return pack;
    const own = pack.viewerMemberId === action.memberId;
    return {
      ...pack,
      reports: [
        {
          id: `waiting:${action.memberId}`,
          missingMemberId: action.memberId,
          reportedByMemberId: pack.viewerMemberId,
          source: own ? "SOS" : "TRIP_LEAD",
          status: "SEARCHING",
          confirmedLost: false,
          shared: null,
          createdAt: now,
          updatedAt: now,
        },
        ...pack.reports,
      ],
    };
  }
  if (action.type !== "status" && action.type !== "lost" && action.type !== "location") return pack;
  const open = openReportFor(pack, action.memberId);
  if (!open) return pack;
  return {
    ...pack,
    reports: pack.reports.map((report) => {
      if (report !== open) return report;
      if (action.type === "status") return { ...report, status: action.status, updatedAt: now };
      if (action.type === "lost") return { ...report, confirmedLost: true, status: "SEARCHING", updatedAt: now };
      return { ...report, shared: { latitude: action.latitude, longitude: action.longitude, at: now }, updatedAt: now };
    }),
  };
}

export type AlertSearch = {
  memberId: string;
  name: string;
  ageGroup: AgeGroup;
  order: number;
  source: ReportSource;
  status: ReportStatus;
  forViewer: boolean;
};
export type SafetyAlert = { tripId: string; tripName: string; ongoing: boolean; searches: AlertSearch[] };
export type Alerts = { signedIn: boolean; alerts: SafetyAlert[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSearch(value: unknown): AlertSearch[] {
  if (!isRecord(value) || typeof value.memberId !== "string") return [];
  const ageGroup = AGE_GROUPS.find((entry) => entry === value.ageGroup);
  const source = REPORT_SOURCES.find((entry) => entry === value.source);
  const status = REPORT_STATUSES.find((entry) => entry === value.status);
  if (!ageGroup || !source || !status) return [];
  return [
    {
      memberId: value.memberId,
      name: typeof value.name === "string" ? value.name : "",
      ageGroup,
      order: typeof value.order === "number" ? value.order : 1,
      source,
      status,
      forViewer: value.forViewer === true,
    },
  ];
}

/** The viewer's trips under way and the searches open on their trips. */
export async function fetchAlerts(signal: AbortSignal): Promise<Alerts> {
  const data: unknown = await (await send("/api/safety/alerts", { method: "GET" }, signal)).json();
  const listed = isRecord(data) && Array.isArray(data.alerts) ? data.alerts : [];
  return {
    signedIn: isRecord(data) && data.signedIn === true,
    alerts: listed.flatMap((entry): SafetyAlert[] =>
      isRecord(entry) && typeof entry.tripId === "string"
        ? [
            {
              tripId: entry.tripId,
              tripName: typeof entry.tripName === "string" ? entry.tripName : "",
              ongoing: entry.ongoing === true,
              searches: Array.isArray(entry.searches) ? entry.searches.flatMap(parseSearch) : [],
            },
          ]
        : [],
    ),
  };
}

export type InviteMember = { id: string; name: string; ageGroup: AgeGroup; taken: boolean; mine: boolean };
export type Invite = { tripId: string; tripName: string; members: InviteMember[]; signedIn: boolean; viewerName: string };

export async function fetchInvite(token: string, signal: AbortSignal): Promise<Invite> {
  const data: unknown = await (await send(`/api/join/${encodeURIComponent(token)}`, { method: "GET" }, signal)).json();
  if (!isRecord(data) || typeof data.tripId !== "string" || !Array.isArray(data.members)) throw new SafetyError("Invalid invite");
  return {
    tripId: data.tripId,
    tripName: typeof data.tripName === "string" ? data.tripName : "",
    signedIn: data.signedIn === true,
    viewerName: typeof data.viewerName === "string" ? data.viewerName : "",
    members: data.members.flatMap((entry): InviteMember[] => {
      const ageGroup = isRecord(entry) ? AGE_GROUPS.find((group) => group === entry.ageGroup) : undefined;
      if (!isRecord(entry) || typeof entry.id !== "string" || !ageGroup) return [];
      return [
        {
          id: entry.id,
          name: typeof entry.name === "string" ? entry.name : "",
          ageGroup,
          taken: entry.taken === true,
          mine: entry.mine === true,
        },
      ];
    }),
  };
}

/**
 * What stands at a point: a short name and the rest of the address, for filling in a meeting point. Null when
 * nothing is known there or the lookup cannot be reached, in which case the form stays as typed.
 */
export async function describePoint(point: { latitude: number; longitude: number }, locale: string): Promise<{ label: string; note: string } | null> {
  try {
    const query = new URLSearchParams({ lat: String(point.latitude), lng: String(point.longitude), lang: locale });
    const data: unknown = await (await send(`/api/geocode?${query}`, { method: "GET" })).json();
    return isRecord(data) && typeof data.label === "string" && typeof data.note === "string" ? { label: data.label, note: data.note } : null;
  } catch {
    return null;
  }
}

const LINK_PREFIX = "kancara-help-link:";
const ORIGIN_PREFIX = "kancara-help-origin:";

/**
 * Picks a member through an invite link. An account joins the trip as them and null comes back. Without an account
 * the answer is that member's own link, which is also kept on the phone so the invite link leads straight to it
 * the next time.
 */
export async function joinTrip(token: string, memberId: string): Promise<string | null> {
  const data: unknown = await (await send(`/api/join/${encodeURIComponent(token)}`, post({ memberId }))).json();
  const helpToken = isRecord(data) && typeof data.helpToken === "string" ? data.helpToken : null;
  if (helpToken) {
    store(LINK_PREFIX + token, helpToken);
    store(ORIGIN_PREFIX + helpToken, token);
  }
  return helpToken;
}

/** Joins the trip as oneself: the signed-in account becomes a new member of the group. */
export async function joinAsSelf(token: string): Promise<void> {
  await send(`/api/join/${encodeURIComponent(token)}`, post({ self: true }));
}

/** The member's own link this phone was given through an invite link, when it was. */
export function readKeptLink(token: string): string | null {
  const kept = readStored(LINK_PREFIX + token);
  return typeof kept === "string" && kept !== "" ? kept : null;
}

/** The invite link a member's own link was picked through on this phone, when it was: the way back to pick again. */
export function readKeptOrigin(helpToken: string): string | null {
  const kept = readStored(ORIGIN_PREFIX + helpToken);
  return typeof kept === "string" && kept !== "" ? kept : null;
}

/** Forgets the member this phone picked through an invite link, so the link shows the names again. */
export function forgetKeptLink(token: string) {
  try {
    const helpToken = readKeptLink(token);
    localStorage.removeItem(LINK_PREFIX + token);
    if (helpToken) localStorage.removeItem(ORIGIN_PREFIX + helpToken);
  } catch {
    // Nothing was kept, so there is nothing to forget.
  }
}

export type FinderView = {
  name: string;
  ageGroup: AgeGroup;
  languages: HelpLanguage[];
  place: string;
  until: string;
  leadPhone: string | null;
  secondaryPhone: string | null;
  told: boolean;
};

export async function fetchFinder(token: string, signal: AbortSignal): Promise<FinderView> {
  const [date, time] = readLocalNow().split(" ");
  const query = new URLSearchParams({ date, time });
  const data: unknown = await (await send(`/api/finder/${encodeURIComponent(token)}?${query}`, { method: "GET" }, signal)).json();
  const ageGroup = isRecord(data) ? AGE_GROUPS.find((group) => group === data.ageGroup) : undefined;
  if (!isRecord(data) || !ageGroup) throw new SafetyError("Invalid card");
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const languages = Array.isArray(data.languages) ? data.languages.filter(isHelpLanguage) : [];
  return {
    name: text(data.name),
    ageGroup,
    languages: languages.length > 0 ? languages : ["en"],
    place: text(data.place),
    until: text(data.until),
    leadPhone: text(data.leadPhone) || null,
    secondaryPhone: text(data.secondaryPhone) || null,
    told: data.told === true,
  };
}

export async function tellGroup(token: string, location: { latitude: number; longitude: number } | null): Promise<void> {
  await send(`/api/finder/${encodeURIComponent(token)}`, post(location ?? {}));
}
