import { type AgeGroup, AGE_GROUPS } from "@/lib/plan-draft";
import { type TripStatus, TRIP_STATUSES } from "@/lib/trips/trip";

// The safety pack: everything a member's phone needs to find someone or to be found, in one answer. It is kept
// on the phone as fetched, so the help page reads the same with or without a connection.

export const REPORT_SOURCES = ["SOS", "TRIP_LEAD", "FINDER"] as const;
export type ReportSource = (typeof REPORT_SOURCES)[number];
export const REPORT_STATUSES = ["SEARCHING", "ON_THE_WAY", "FOUND"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export const CONTACT_LABELS = ["INFO_DESK", "SECURITY", "LODGING", "GUIDE", "OTHER"] as const;
export type ContactLabel = (typeof CONTACT_LABELS)[number];

export type SafetyMember = {
  id: string;
  /** The member's id inside the plan document. */
  key: string;
  name: string;
  ageGroup: AgeGroup;
  phone: string | null;
  hasPhone: boolean;
  /** True when an account has joined the trip as this member, so Kancara can reach them on their phone. */
  joined: boolean;
  cardToken: string;
  /** Opens the help page as this member, with no account. Empty for members whose link the holder may not pass on. */
  helpToken: string;
  cardSavedAt: string | null;
};

export type SharedLocation = { latitude: number; longitude: number; at: string };

export type SafetyReport = {
  id: string;
  missingMemberId: string;
  reportedByMemberId: string | null;
  source: ReportSource;
  status: ReportStatus;
  /** The missing member answered that they are lost. */
  confirmedLost: boolean;
  shared: SharedLocation | null;
  createdAt: string;
  updatedAt: string;
};

export type MeetingPoint = { label: string; note: string; latitude: number | null; longitude: number | null; setAt: string };
export type LocalContact = { id: string; placeName: string; labelKey: ContactLabel; phone: string };
export type SafetyStop = { time: string; title: string; address: string };
export type SafetyDay = { date: string; stops: SafetyStop[] };

export type SafetyPack = {
  tripId: string;
  tripName: string;
  status: TripStatus;
  destinations: string[];
  countryCodes: string[];
  /** False for someone who came in through a member's own link: they can ask for help and answer, not change the setup. */
  canManage: boolean;
  /** The member the viewer joined as. Null until they say who they are. */
  viewerMemberId: string | null;
  /** The member the trip's creator joined as: the first number on every meeting card. */
  leadMemberId: string | null;
  members: SafetyMember[];
  secondaryPhone: string | null;
  meetingPoint: MeetingPoint | null;
  contacts: LocalContact[];
  /** Searches under way, and those that ended in the last day. */
  reports: SafetyReport[];
  days: SafetyDay[];
  inviteToken: string;
  fetchedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const textOrNull = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);
const numberOrNull = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const pick = <Value extends string>(options: readonly Value[], value: unknown): Value | undefined =>
  options.find((option) => option === value);

function parseMember(value: unknown): SafetyMember[] {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.key !== "string") return [];
  const ageGroup = pick(AGE_GROUPS, value.ageGroup);
  if (!ageGroup) return [];
  return [
    {
      id: value.id,
      key: value.key,
      name: text(value.name),
      ageGroup,
      phone: textOrNull(value.phone),
      hasPhone: value.hasPhone !== false,
      joined: value.joined === true,
      cardToken: text(value.cardToken),
      helpToken: text(value.helpToken),
      cardSavedAt: textOrNull(value.cardSavedAt),
    },
  ];
}

function parseShared(value: unknown): SharedLocation | null {
  if (!isRecord(value)) return null;
  const latitude = numberOrNull(value.latitude);
  const longitude = numberOrNull(value.longitude);
  return latitude === null || longitude === null ? null : { latitude, longitude, at: text(value.at) };
}

function parseReport(value: unknown): SafetyReport[] {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.missingMemberId !== "string") return [];
  const source = pick(REPORT_SOURCES, value.source);
  const status = pick(REPORT_STATUSES, value.status);
  if (!source || !status) return [];
  return [
    {
      id: value.id,
      missingMemberId: value.missingMemberId,
      reportedByMemberId: textOrNull(value.reportedByMemberId),
      source,
      status,
      confirmedLost: value.confirmedLost === true,
      shared: parseShared(value.shared),
      createdAt: text(value.createdAt),
      updatedAt: text(value.updatedAt),
    },
  ];
}

function parseMeetingPoint(value: unknown): MeetingPoint | null {
  if (!isRecord(value) || typeof value.label !== "string" || value.label.trim() === "") return null;
  return {
    label: value.label,
    note: text(value.note),
    latitude: numberOrNull(value.latitude),
    longitude: numberOrNull(value.longitude),
    setAt: text(value.setAt),
  };
}

function parseContact(value: unknown): LocalContact[] {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.phone !== "string") return [];
  const labelKey = pick(CONTACT_LABELS, value.labelKey);
  return labelKey ? [{ id: value.id, placeName: text(value.placeName), labelKey, phone: value.phone }] : [];
}

function parseDay(value: unknown): SafetyDay[] {
  if (!isRecord(value) || typeof value.date !== "string" || !Array.isArray(value.stops)) return [];
  const stops = value.stops.flatMap((stop): SafetyStop[] =>
    isRecord(stop) && typeof stop.time === "string" && typeof stop.title === "string"
      ? [{ time: stop.time, title: stop.title, address: text(stop.address) }]
      : [],
  );
  return [{ date: value.date, stops }];
}

const list = <Item>(value: unknown, parse: (entry: unknown) => Item[]): Item[] =>
  Array.isArray(value) ? value.flatMap(parse) : [];

/** A pack as it arrived from the server or was read back from the phone. Null when it is not one. */
export function parseSafetyPack(value: unknown): SafetyPack | null {
  if (!isRecord(value) || typeof value.tripId !== "string") return null;
  const status = pick(TRIP_STATUSES, value.status);
  if (!status) return null;
  return {
    tripId: value.tripId,
    tripName: text(value.tripName),
    status,
    destinations: list(value.destinations, (entry) => (typeof entry === "string" ? [entry] : [])),
    countryCodes: list(value.countryCodes, (entry) => (typeof entry === "string" ? [entry] : [])),
    canManage: value.canManage !== false,
    viewerMemberId: textOrNull(value.viewerMemberId),
    leadMemberId: textOrNull(value.leadMemberId),
    members: list(value.members, parseMember),
    secondaryPhone: textOrNull(value.secondaryPhone),
    meetingPoint: parseMeetingPoint(value.meetingPoint),
    contacts: list(value.contacts, parseContact),
    reports: list(value.reports, parseReport),
    days: list(value.days, parseDay),
    inviteToken: text(value.inviteToken),
    fetchedAt: text(value.fetchedAt),
  };
}

/** The search for a member that is still open, when there is one. */
export function openReportFor(pack: SafetyPack, memberId: string): SafetyReport | null {
  return pack.reports.find((report) => report.missingMemberId === memberId && report.status !== "FOUND") ?? null;
}
