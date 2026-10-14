import { isCountryCode } from "@/lib/travel/countries";
import { type ContactLabel, type ReportStatus, CONTACT_LABELS, REPORT_STATUSES } from "@/lib/safety/safety-pack";

// Everything a member can change on the help page is one of these. Each names the member it is about instead of
// a search's id, so an action taken without a connection can wait in a queue and still make sense when it is sent.

export type MeetingPointInput = { label: string; note: string; latitude: number | null; longitude: number | null };

export type SafetyAction =
  /** "This is me": ties the viewer's account to a member of the plan. */
  | { type: "claim"; memberId: string }
  | { type: "member"; memberId: string; phone: string | null; hasPhone: boolean }
  | { type: "cardSaved"; memberId: string; saved: boolean }
  | { type: "secondaryPhone"; phone: string | null }
  | { type: "meetingPoint"; point: MeetingPointInput | null }
  | { type: "addContact"; placeName: string; labelKey: ContactLabel; phone: string }
  | { type: "removeContact"; contactId: string }
  /** Opens a search for a member. It is an SOS when the member is the viewer. */
  | { type: "report"; memberId: string }
  | { type: "status"; memberId: string; status: ReportStatus }
  /** The missing member's own answer: "I am lost". */
  | { type: "lost"; memberId: string }
  /** A location shared once into the member's open search. */
  | { type: "location"; memberId: string; latitude: number; longitude: number }
  /** The countries the trip visits, when the ones worked out from its destinations are wrong. */
  | { type: "countries"; codes: string[] }
  | { type: "renewInvite" };

export const MAX_LABEL_CHARS = 80;
export const MAX_NOTE_CHARS = 160;
export const MAX_CONTACTS = 20;
const MAX_COUNTRIES = 6;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isId = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 64;
const isLatitude = (value: unknown): value is number => typeof value === "number" && Math.abs(value) <= 90;
const isLongitude = (value: unknown): value is number => typeof value === "number" && Math.abs(value) <= 180;
const phoneOrNull = (value: unknown): string | null | undefined =>
  value === null ? null : typeof value === "string" && value.length <= 32 ? value : undefined;

function readPoint(value: unknown): MeetingPointInput | null | undefined {
  if (value === null) return null;
  if (!isRecord(value) || typeof value.label !== "string" || value.label.trim() === "") return undefined;
  const placed = isLatitude(value.latitude) && isLongitude(value.longitude);
  return {
    label: value.label.trim().slice(0, MAX_LABEL_CHARS),
    note: typeof value.note === "string" ? value.note.trim().slice(0, MAX_NOTE_CHARS) : "",
    latitude: placed ? (value.latitude as number) : null,
    longitude: placed ? (value.longitude as number) : null,
  };
}

/** An action as sent by a browser, checked field by field. Null when it is not one. */
export function readSafetyAction(value: unknown): SafetyAction | null {
  if (!isRecord(value)) return null;
  const { type, memberId } = value;
  if (type === "renewInvite") return { type };
  if (type === "countries") {
    const codes = Array.isArray(value.codes) ? value.codes.filter(isCountryCode).slice(0, MAX_COUNTRIES) : null;
    return codes ? { type, codes: [...new Set(codes)] } : null;
  }
  if (type === "secondaryPhone") {
    const phone = phoneOrNull(value.phone);
    return phone === undefined ? null : { type, phone };
  }
  if (type === "meetingPoint") {
    const point = readPoint(value.point);
    return point === undefined ? null : { type, point };
  }
  if (type === "addContact") {
    const labelKey = CONTACT_LABELS.find((label) => label === value.labelKey);
    if (!labelKey || typeof value.placeName !== "string" || typeof value.phone !== "string") return null;
    const placeName = value.placeName.trim().slice(0, MAX_LABEL_CHARS);
    return placeName === "" ? null : { type, placeName, labelKey, phone: value.phone };
  }
  if (type === "removeContact") return isId(value.contactId) ? { type, contactId: value.contactId } : null;
  if (!isId(memberId)) return null;
  if (type === "claim" || type === "report" || type === "lost") return { type, memberId };
  if (type === "member") {
    const phone = phoneOrNull(value.phone);
    return phone === undefined || typeof value.hasPhone !== "boolean" ? null : { type, memberId, phone, hasPhone: value.hasPhone };
  }
  if (type === "cardSaved") return typeof value.saved === "boolean" ? { type, memberId, saved: value.saved } : null;
  if (type === "status") {
    const status = REPORT_STATUSES.find((entry) => entry === value.status);
    return status ? { type, memberId, status } : null;
  }
  if (type === "location") {
    return isLatitude(value.latitude) && isLongitude(value.longitude)
      ? { type, memberId, latitude: value.latitude, longitude: value.longitude }
      : null;
  }
  return null;
}
