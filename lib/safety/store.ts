import "server-only";
import type { EmergencyContact, MissingReport, Prisma, Trip, TripMember, TripSafetySetting } from "@prisma/client";
import { after } from "next/server";
import type { Viewer } from "@/lib/account";
import { parseItinerary } from "@/lib/api/captain";
import {
  type AgeGroup,
  type Member,
  type MemberContact,
  ageGroupFor,
  carriesPhoneByDefault,
  createMember,
  MAX_MEMBERS,
  parsePlanDraft,
} from "@/lib/plan-draft";
import { MESSAGES } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";
import { isSigned, seal, sign, unseal } from "@/lib/secret-box";
import { isCountryCode } from "@/lib/travel/countries";
import { readClock } from "@/lib/trips/store";
import type { TripStatus } from "@/lib/trips/trip";
import { type SafetyAction, MAX_CONTACTS } from "./action";
import { normalizePhone } from "./contact";
import { type HelpLanguage, helpLanguages } from "./help-phrases";
import {
  type ContactLabel,
  type ReportSource,
  type ReportStatus,
  type SafetyDay,
  type SafetyPack,
  type SafetyReport,
  CONTACT_LABELS,
  REPORT_SOURCES,
  REPORT_STATUSES,
} from "./pack";
import { planPosition } from "./plan-position";

// The server side of finding a separated member: who can be reached and how, the searches under way, the links
// that let someone join a trip or a stranger report in. A trip's creator and every account that joined it see
// and may change the same things. A member who came in through their own link, with no account, sees the same
// and can ask for help and answer, but not change the setup.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[0-9a-f]{64}$/;
const DAY_MS = 86_400_000;
// A finished search stays in the pack for a day, so everyone sees how it ended.
const RECENT_MS = DAY_MS;
// A meeting card answers for a week after the trip ends, then stops.
const CARD_DAYS_AFTER_TRIP = 7;
const UNIQUE_VIOLATION = "P2002";
const MAX_ALERT_TRIPS = 5;
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const GEOCODE_TIMEOUT_MS = 4000;

// What a member's own link may do: ask for help, answer, and keep their card. Their own contact is allowed too.
const LINK_ACTIONS: SafetyAction["type"][] = ["report", "status", "lost", "location", "cardSaved"];

type Clock = ReturnType<typeof readClock>;
export type ActionResult = SafetyPack | "notFound" | "invalid" | "taken";
/** Who is holding the pack: an account on the trip, or the holder of one member's own link. */
type Holder = { userId: string } | { tripMemberId: string };
type LinkPurpose = "card" | "help";

const compact = (uuid: string) => uuid.replace(/-/g, "");
const expand = (hex: string) => `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
const memberToken = (purpose: LinkPurpose, tripMemberId: string) => compact(tripMemberId) + sign(purpose, tripMemberId);
const inviteToken = (tripId: string, version: number) => compact(tripId) + sign("invite", `${tripId}:${version}`);

/** The id a token carries and the signature after it. Null when the token has the wrong shape. */
function splitToken(token: string): { id: string; signature: string } | null {
  if (!TOKEN.test(token)) return null;
  return { id: expand(token.slice(0, 32)), signature: token.slice(32) };
}

function isoDate(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function statusOf(trip: Trip, clock: Clock): TripStatus {
  if (trip.state === "DRAFT") return "draft";
  const start = isoDate(trip.startDate);
  const end = isoDate(trip.endDate);
  if (start && clock.date < start) return "upcoming";
  return end && clock.date > end ? "completed" : "ongoing";
}

function readMembers(trip: Trip): Member[] {
  return parsePlanDraft(trip.planDraft)?.members ?? [];
}

function readDays(trip: Trip): SafetyDay[] {
  try {
    return parseItinerary(trip.itinerary).days.map((day) => ({
      date: day.date,
      stops: day.items.map((item) => ({ time: item.time, title: item.title, address: item.address ?? "" })),
    }));
  } catch {
    return [];
  }
}

/**
 * The countries a trip visits, looked up from its destinations the first time they are needed and kept on the
 * trip. They decide which emergency numbers and which language the meeting cards carry. A lookup that fails
 * leaves the list empty, and the pack falls back to the number that works worldwide and to English.
 */
async function ensureCountries(trip: Trip): Promise<string[]> {
  if (trip.countryCodes.length > 0 || trip.destinations.length === 0) return trip.countryCodes;
  const found = await Promise.all(
    trip.destinations.map(async (name) => {
      // The lookup knows plain place names. One written with its region ("Glodok, Jakarta") is tried as written,
      // then by its last part.
      const tries = [...new Set([name, name.split(",").pop() ?? ""].map((entry) => entry.trim()).filter(Boolean))];
      for (const entry of tries) {
        try {
          const query = new URLSearchParams({ name: entry, count: "1", format: "json" });
          const reply = await fetch(GEOCODE_URL + "?" + query, { signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS) });
          const data = (await reply.json()) as { results?: { country_code?: unknown }[] };
          const code = data.results?.[0]?.country_code;
          if (isCountryCode(code)) return [code];
        } catch {
          // The next spelling is tried.
        }
      }
      return [];
    }),
  );
  const codes = [...new Set(found.flat())];
  if (codes.length > 0) await prisma.trip.update({ where: { tripId: trip.tripId }, data: { countryCodes: codes } });
  return codes;
}

function tripAccess(viewer: Viewer): Prisma.TripWhereInput {
  return {
    deletedAt: null,
    OR: [{ workspaceId: viewer.workspaceId }, { members: { some: { userId: viewer.userId, deletedAt: null } } }],
  };
}

async function findTrip(viewer: Viewer, tripId: string): Promise<Trip | null> {
  if (!UUID.test(tripId)) return null;
  return prisma.trip.findFirst({ where: { tripId, ...tripAccess(viewer) } });
}

/**
 * Keeps one row per member of the plan. A member added to the plan gets a row, one removed from it has theirs
 * set aside, and one put back gets theirs again with the number it held.
 */
async function syncMembers(trip: Trip): Promise<TripMember[]> {
  const planned = readMembers(trip);
  const keys = planned.map((member) => member.id);
  const rows = await prisma.tripMember.findMany({ where: { tripId: trip.tripId, workspaceId: trip.workspaceId } });
  const known = new Set(rows.map((row) => row.memberKey));
  const added = planned.filter((member) => !known.has(member.id));
  const removed = rows.filter((row) => row.deletedAt === null && !keys.includes(row.memberKey));
  const returned = rows.filter((row) => row.deletedAt !== null && keys.includes(row.memberKey));

  if (added.length + removed.length + returned.length > 0) {
    await prisma.$transaction([
      prisma.tripMember.createMany({
        data: added.map((member) => ({
          workspaceId: trip.workspaceId,
          tripId: trip.tripId,
          memberKey: member.id,
          hasPhone: member.carriesPhone ?? carriesPhoneByDefault(member.ageGroup),
        })),
        skipDuplicates: true,
      }),
      prisma.tripMember.updateMany({
        where: { tripMemberId: { in: removed.map((row) => row.tripMemberId) } },
        data: { deletedAt: new Date() },
      }),
      prisma.tripMember.updateMany({
        where: { tripMemberId: { in: returned.map((row) => row.tripMemberId) } },
        data: { deletedAt: null },
      }),
    ]);
  }
  const live = await prisma.tripMember.findMany({ where: { tripId: trip.tripId, deletedAt: null } });
  return live.sort((first, second) => keys.indexOf(first.memberKey) - keys.indexOf(second.memberKey));
}

function toReport(report: MissingReport): SafetyReport {
  const source = REPORT_SOURCES.find((entry) => entry === report.source) ?? "TRIP_LEAD";
  const status = REPORT_STATUSES.find((entry) => entry === report.status) ?? "SEARCHING";
  const placed = report.sharedLatitude !== null && report.sharedLongitude !== null;
  return {
    id: report.missingReportId,
    missingMemberId: report.missingTripMemberId,
    reportedByMemberId: report.reportedByTripMemberId,
    source,
    status,
    confirmedLost: report.confirmedLostAt !== null,
    shared: placed
      ? {
          latitude: report.sharedLatitude as number,
          longitude: report.sharedLongitude as number,
          at: (report.sharedAt ?? report.updatedAt).toISOString(),
        }
      : null,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

async function buildPack(holder: Holder, trip: Trip): Promise<SafetyPack> {
  const rows = await syncMembers(trip);
  const canManage = "userId" in holder;
  const viewerMemberId = canManage
    ? (rows.find((row) => row.userId === holder.userId)?.tripMemberId ?? null)
    : holder.tripMemberId;
  const [countryCodes, setting, contacts, reports] = await Promise.all([
    ensureCountries(trip),
    prisma.tripSafetySetting.findFirst({ where: { tripId: trip.tripId, deletedAt: null } }),
    prisma.emergencyContact.findMany({ where: { tripId: trip.tripId, deletedAt: null }, orderBy: { createdAt: "asc" } }),
    prisma.missingReport.findMany({
      where: {
        tripId: trip.tripId,
        deletedAt: null,
        OR: [{ status: { not: "FOUND" } }, { resolvedAt: { gte: new Date(Date.now() - RECENT_MS) } }],
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const planned = readMembers(trip);
  const clock = readClock(new Date());

  return {
    tripId: trip.tripId,
    tripName: trip.name,
    status: statusOf(trip, clock),
    destinations: trip.destinations,
    countryCodes,
    canManage,
    viewerMemberId,
    leadMemberId: rows.find((row) => row.userId === trip.userId)?.tripMemberId ?? null,
    members: rows.flatMap((row) => {
      const member = planned.find((entry) => entry.id === row.memberKey);
      if (!member) return [];
      return [
        {
          id: row.tripMemberId,
          key: row.memberKey,
          name: member.name,
          ageGroup: member.ageGroup,
          phone: unseal(row.phoneNumberCipher),
          hasPhone: row.hasPhone,
          joined: row.userId !== null,
          cardToken: memberToken("card", row.tripMemberId),
          // Someone who came in through a link is handed their own and nobody else's.
          helpToken: canManage || row.tripMemberId === viewerMemberId ? memberToken("help", row.tripMemberId) : "",
          cardSavedAt: row.cardSavedAt?.toISOString() ?? null,
        },
      ];
    }),
    secondaryPhone: unseal(setting?.secondaryPhoneNumberCipher ?? null),
    meetingPoint:
      setting?.meetingPointLabel && setting.meetingPointSetAt
        ? {
            label: setting.meetingPointLabel,
            note: setting.meetingPointNote ?? "",
            latitude: setting.meetingPointLatitude,
            longitude: setting.meetingPointLongitude,
            setAt: setting.meetingPointSetAt.toISOString(),
          }
        : null,
    contacts: contacts.map((contact: EmergencyContact) => ({
      id: contact.emergencyContactId,
      placeName: contact.placeName,
      labelKey: CONTACT_LABELS.find((label) => label === contact.labelKey) ?? ("OTHER" satisfies ContactLabel),
      phone: contact.phoneNumber,
    })),
    reports: reports.map(toReport),
    days: readDays(trip),
    inviteToken: canManage ? inviteToken(trip.tripId, setting?.inviteVersion ?? 1) : "",
    fetchedAt: new Date().toISOString(),
  };
}

/** The safety pack of a trip the viewer created or joined. Null when there is no such trip. */
export async function getSafetyPack(viewer: Viewer, tripId: string): Promise<SafetyPack | null> {
  const trip = await findTrip(viewer, tripId);
  return trip ? buildPack({ userId: viewer.userId }, trip) : null;
}

type SettingChange = Partial<
  Pick<
    TripSafetySetting,
    | "secondaryPhoneNumberCipher"
    | "inviteVersion"
    | "meetingPointLabel"
    | "meetingPointNote"
    | "meetingPointLatitude"
    | "meetingPointLongitude"
    | "meetingPointSetAt"
  >
>;

function saveSetting(trip: Trip, data: SettingChange) {
  return prisma.tripSafetySetting.upsert({
    where: { tripId: trip.tripId },
    create: { workspaceId: trip.workspaceId, tripId: trip.tripId, ...data },
    update: data,
  });
}

/** Ties an account to one member of a trip, letting go of any other member it held there. */
async function claimMember(trip: Trip, userId: string, tripMemberId: string): Promise<boolean> {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.tripMember.updateMany({
        where: { tripId: trip.tripId, userId, tripMemberId: { not: tripMemberId } },
        data: { userId: null },
      });
      const claimed = await tx.tripMember.updateMany({
        where: { tripMemberId, tripId: trip.tripId, deletedAt: null, OR: [{ userId: null }, { userId }] },
        data: { userId },
      });
      if (claimed.count !== 1) return false;
      // A member nobody gave a number takes the one on the account that just became them.
      const account = await tx.user.findFirst({ where: { userId }, select: { phoneNumberCipher: true } });
      if (account?.phoneNumberCipher) {
        await tx.tripMember.updateMany({ where: { tripMemberId, phoneNumberCipher: null }, data: { phoneNumberCipher: account.phoneNumberCipher } });
      }
      return true;
    });
  } catch (error) {
    if ((error as { code?: string }).code === UNIQUE_VIOLATION) return false;
    throw error;
  }
}

type SearchNews = ReportSource | "FOUND";

/**
 * Tells the accounts on a trip, on every device they turned notifications on with, that a search began or ended.
 * Whoever caused the news is left out: they know. The member being looked for is told so in their own words. It
 * is sent after the answer has gone out, so a slow notification never holds up asking for help.
 */
function announce(trip: Trip, rows: TripMember[], missing: TripMember, news: SearchNews, actorUserId: string | null) {
  const name = readMembers(trip).find((member) => member.id === missing.memberKey)?.name.trim() ?? "";
  const accounts = [...new Set([trip.userId, ...rows.flatMap((row) => (row.userId ? [row.userId] : []))])].filter((userId) => userId !== actorUserId);
  if (accounts.length === 0) return;
  const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
  after(() =>
    sendPush(accounts, (locale, userId) => {
      const text = MESSAGES[locale].safety.push;
      const who = name || text.someone;
      const theirs = missing.userId === userId;
      const title =
        news === "FOUND"
          ? fill(text.foundTitle, { name: who })
          : theirs
            ? text.askingTitle
            : fill(news === "SOS" ? text.sosTitle : news === "FINDER" ? text.finderTitle : text.searchTitle, { name: who });
      const body = news === "FOUND" ? fill(text.foundBody, { trip: trip.name }) : theirs ? text.askingBody : text.body;
      return { title, body, url: `/trips/${trip.tripId}/help?member=${missing.tripMemberId}`, tag: `search-${missing.tripMemberId}` };
    }),
  );
}

/** Opens a search for a member unless one is open already. True when this call is the one that opened it. */
async function openSearch(trip: Trip, missingTripMemberId: string, reportedByTripMemberId: string | null, source: ReportSource): Promise<boolean> {
  const open = await prisma.missingReport.findFirst({
    where: { missingTripMemberId, status: { not: "FOUND" }, deletedAt: null },
    select: { missingReportId: true },
  });
  if (open) return false;
  try {
    await prisma.missingReport.create({
      data: {
        workspaceId: trip.workspaceId,
        tripId: trip.tripId,
        missingTripMemberId,
        reportedByTripMemberId,
        source,
        status: "SEARCHING" satisfies ReportStatus,
      },
    });
    return true;
  } catch (error) {
    // Someone else opened the search a moment earlier; there is one search per member, and it is theirs.
    if ((error as { code?: string }).code !== UNIQUE_VIOLATION) throw error;
    return false;
  }
}

function updateOpenSearch(trip: Trip, missingTripMemberId: string, data: Prisma.MissingReportUpdateManyMutationInput) {
  return prisma.missingReport.updateMany({
    where: { tripId: trip.tripId, missingTripMemberId, status: { not: "FOUND" }, deletedAt: null },
    data,
  });
}

async function applyAction(holder: Holder, trip: Trip, action: SafetyAction): Promise<ActionResult> {
  const rows = await syncMembers(trip);
  const viewerRow = rows.find((row) => ("userId" in holder ? row.userId === holder.userId : row.tripMemberId === holder.tripMemberId)) ?? null;
  const target = "memberId" in action ? rows.find((row) => row.tripMemberId === action.memberId) : undefined;
  if ("memberId" in action && !target) return "invalid";
  const actorUserId = "userId" in holder ? holder.userId : null;
  if (!("userId" in holder)) {
    const own = action.type === "member" && action.memberId === holder.tripMemberId;
    if (!own && !LINK_ACTIONS.includes(action.type)) return "invalid";
  }

  if (action.type === "claim") {
    if (!("userId" in holder) || !(await claimMember(trip, holder.userId, action.memberId))) return "taken";
  } else if (action.type === "member") {
    const phone = action.phone === null || action.phone.trim() === "" ? null : normalizePhone(action.phone);
    if (action.phone && action.phone.trim() !== "" && phone === null) return "invalid";
    await prisma.tripMember.update({
      where: { tripMemberId: action.memberId },
      data: { phoneNumberCipher: phone ? seal(phone) : null, hasPhone: action.hasPhone },
    });
  } else if (action.type === "cardSaved") {
    await prisma.tripMember.update({
      where: { tripMemberId: action.memberId },
      data: { cardSavedAt: action.saved ? new Date() : null },
    });
  } else if (action.type === "secondaryPhone") {
    const phone = action.phone === null || action.phone.trim() === "" ? null : normalizePhone(action.phone);
    if (action.phone && action.phone.trim() !== "" && phone === null) return "invalid";
    await saveSetting(trip, { secondaryPhoneNumberCipher: phone ? seal(phone) : null });
  } else if (action.type === "meetingPoint") {
    await saveSetting(trip, {
      meetingPointLabel: action.point?.label ?? null,
      meetingPointNote: action.point?.note ?? null,
      meetingPointLatitude: action.point?.latitude ?? null,
      meetingPointLongitude: action.point?.longitude ?? null,
      meetingPointSetAt: action.point ? new Date() : null,
    });
  } else if (action.type === "addContact") {
    const phone = normalizePhone(action.phone) ?? (/^\d{3,6}$/.test(action.phone.trim()) ? action.phone.trim() : null);
    const count = await prisma.emergencyContact.count({ where: { tripId: trip.tripId, deletedAt: null } });
    if (phone === null || count >= MAX_CONTACTS) return "invalid";
    await prisma.emergencyContact.create({
      data: { workspaceId: trip.workspaceId, tripId: trip.tripId, placeName: action.placeName, labelKey: action.labelKey, phoneNumber: phone },
    });
  } else if (action.type === "removeContact") {
    if (!UUID.test(action.contactId)) return "invalid";
    await prisma.emergencyContact.updateMany({
      where: { emergencyContactId: action.contactId, tripId: trip.tripId },
      data: { deletedAt: new Date() },
    });
  } else if (action.type === "report") {
    const own = viewerRow?.tripMemberId === action.memberId;
    const source = own ? "SOS" : "TRIP_LEAD";
    const opened = await openSearch(trip, action.memberId, viewerRow?.tripMemberId ?? null, source);
    if (opened && target) announce(trip, rows, target, source, actorUserId);
  } else if (action.type === "status") {
    const changed = await updateOpenSearch(trip, action.memberId, {
      status: action.status,
      resolvedAt: action.status === "FOUND" ? new Date() : null,
    });
    if (action.status === "FOUND" && changed.count > 0 && target) announce(trip, rows, target, "FOUND", actorUserId);
  } else if (action.type === "lost") {
    await updateOpenSearch(trip, action.memberId, { confirmedLostAt: new Date(), status: "SEARCHING" satisfies ReportStatus });
  } else if (action.type === "location") {
    await updateOpenSearch(trip, action.memberId, {
      sharedLatitude: action.latitude,
      sharedLongitude: action.longitude,
      sharedAt: new Date(),
    });
  } else if (action.type === "countries") {
    await prisma.trip.update({ where: { tripId: trip.tripId }, data: { countryCodes: action.codes } });
    trip.countryCodes = action.codes;
  } else {
    const setting = await prisma.tripSafetySetting.findFirst({ where: { tripId: trip.tripId } });
    await saveSetting(trip, { inviteVersion: (setting?.inviteVersion ?? 1) + 1 });
  }
  return buildPack(holder, trip);
}

/** Applies one action to a trip the viewer created or joined, and answers with the pack as it stands after. */
export async function applySafetyAction(viewer: Viewer, tripId: string, action: SafetyAction): Promise<ActionResult> {
  const trip = await findTrip(viewer, tripId);
  return trip ? applyAction({ userId: viewer.userId }, trip, action) : "notFound";
}

/**
 * Keeps what a plan says about reaching its members: the number, sealed, and whether they carry a phone. Only
 * what the plan says is touched. A number that cannot be read is left as it was instead of wiping a good one.
 */
export async function keepPlanContacts(viewer: Viewer, tripId: string, contacts: MemberContact[]): Promise<void> {
  if (contacts.length === 0) return;
  const trip = await prisma.trip.findFirst({ where: { tripId, workspaceId: viewer.workspaceId, deletedAt: null } });
  if (!trip) return;
  const rows = await syncMembers(trip);
  await Promise.all(
    contacts.map((contact) => {
      const row = rows.find((entry) => entry.memberKey === contact.memberId);
      if (!row) return null;
      const phone = contact.phone === null ? null : normalizePhone(contact.phone);
      const cleared = contact.phone !== null && contact.phone.trim() === "";
      return prisma.tripMember.update({
        where: { tripMemberId: row.tripMemberId },
        data: {
          ...(cleared ? { phoneNumberCipher: null } : phone ? { phoneNumberCipher: seal(phone) } : {}),
          ...(contact.carriesPhone === null ? {} : { hasPhone: contact.carriesPhone }),
        },
      });
    }),
  );
}

export type InviteView = {
  tripId: string;
  tripName: string;
  destinations: string[];
  members: { id: string; name: string; ageGroup: AgeGroup; taken: boolean; mine: boolean }[];
  /** False for someone with no account: they pick a member and get that member's own link instead of joining. */
  signedIn: boolean;
  /** The name the viewer's account would join under. Empty with no account, or with an account that has no name. */
  viewerName: string;
};

const MAX_NAME_CHARS = 40;

/** The name an account joins a trip under: the one on its profile, else its username, else the start of its email. */
async function accountName(viewer: Viewer): Promise<{ name: string; age: number | null; phoneNumberCipher: string | null }> {
  const user = await prisma.user.findFirst({
    where: { userId: viewer.userId },
    select: { displayName: true, username: true, age: true, phoneNumberCipher: true },
  });
  const name = user?.displayName?.trim() || user?.username?.trim() || viewer.email?.split("@")[0] || "";
  return { name: name.slice(0, MAX_NAME_CHARS), age: user?.age ?? null, phoneNumberCipher: user?.phoneNumberCipher ?? null };
}

async function findInvitedTrip(token: string): Promise<Trip | null> {
  const parts = splitToken(token);
  if (!parts) return null;
  const trip = await prisma.trip.findFirst({ where: { tripId: parts.id, deletedAt: null } });
  if (!trip) return null;
  const setting = await prisma.tripSafetySetting.findFirst({ where: { tripId: trip.tripId } });
  return isSigned("invite", `${trip.tripId}:${setting?.inviteVersion ?? 1}`, parts.signature) ? trip : null;
}

/** What an invite link opens: the trip's name and the members someone can join as. Null for a link that no longer works. */
export async function getInvite(viewer: Viewer | null, token: string): Promise<InviteView | null> {
  const trip = await findInvitedTrip(token);
  if (!trip) return null;
  const rows = await syncMembers(trip);
  const planned = readMembers(trip);
  return {
    tripId: trip.tripId,
    tripName: trip.name,
    destinations: trip.destinations,
    members: rows.flatMap((row) => {
      const member = planned.find((entry) => entry.id === row.memberKey);
      if (!member) return [];
      const mine = viewer !== null && row.userId === viewer.userId;
      // Without an account nothing is taken away from anyone, so no member is closed to them.
      const taken = viewer !== null && row.userId !== null && !mine;
      return [{ id: row.tripMemberId, name: member.name, ageGroup: member.ageGroup, taken, mine }];
    }),
    signedIn: viewer !== null,
    viewerName: viewer ? (await accountName(viewer)).name : "",
  };
}

/**
 * Joins a trip through its invite link as oneself: the account becomes a new member of the plan, named after its
 * profile. Nobody has to have added them first. An account already on the trip stays the member it is.
 */
export async function joinAsSelf(viewer: Viewer, token: string): Promise<"joined" | "notFound" | "full"> {
  const invited = await findInvitedTrip(token);
  if (!invited) return "notFound";
  const { name, age, phoneNumberCipher } = await accountName(viewer);
  return prisma.$transaction(async (transaction) => {
    // The plan is one document; the row is held so two people joining at once do not write over each other.
    await transaction.$queryRaw`SELECT 1 FROM trips WHERE trip_id = ${invited.tripId}::uuid FOR UPDATE`;
    const trip = await transaction.trip.findFirst({ where: { tripId: invited.tripId, deletedAt: null } });
    if (!trip) return "notFound";
    const already = await transaction.tripMember.findFirst({ where: { tripId: trip.tripId, userId: viewer.userId, deletedAt: null } });
    if (already) return "joined";

    // The stored document is added to as it is; reading it through the parser would fill in defaults it never had.
    const stored = typeof trip.planDraft === "object" && trip.planDraft !== null && !Array.isArray(trip.planDraft) ? trip.planDraft : {};
    const members = Array.isArray(stored.members) ? stored.members : [];
    if (members.length >= MAX_MEMBERS) return "full";
    const fits = age !== null && age > 0;
    const member: Member = { ...createMember(fits ? ageGroupFor(age) : "adult"), name, age: fits ? age : null };
    await transaction.trip.update({
      where: { tripId: trip.tripId },
      data: { planDraft: { ...stored, members: [...members, member] } as unknown as Prisma.InputJsonValue },
    });
    await transaction.tripMember.create({
      // The number on the account comes along, already sealed, so the group can reach them from the start.
      data: { workspaceId: trip.workspaceId, tripId: trip.tripId, memberKey: member.id, userId: viewer.userId, hasPhone: true, phoneNumberCipher },
    });
    return "joined";
  });
}

/** Joins a trip through its invite link as one of its members. */
export async function joinTrip(viewer: Viewer, token: string, tripMemberId: string): Promise<"joined" | "notFound" | "taken"> {
  const trip = await findInvitedTrip(token);
  if (!trip || !UUID.test(tripMemberId)) return "notFound";
  await syncMembers(trip);
  return (await claimMember(trip, viewer.userId, tripMemberId)) ? "joined" : "taken";
}

/** The own link of a member picked through the invite link by someone with no account. Null when there is no such member. */
export async function pickMember(token: string, tripMemberId: string): Promise<string | null> {
  const trip = await findInvitedTrip(token);
  if (!trip || !UUID.test(tripMemberId)) return null;
  const rows = await syncMembers(trip);
  return rows.some((row) => row.tripMemberId === tripMemberId) ? memberToken("help", tripMemberId) : null;
}

export type FinderView = {
  /** Only a first name or nickname is shown to a stranger. */
  name: string;
  ageGroup: AgeGroup;
  languages: HelpLanguage[];
  /** Where the plan has the group right now, when it says. */
  place: string;
  until: string;
  leadPhone: string | null;
  secondaryPhone: string | null;
  /** True once this card has told the group that someone is with the member. */
  told: boolean;
};

type FoundCard = { trip: Trip; row: TripMember; member: Member };

async function findMemberLink(purpose: LinkPurpose, token: string): Promise<FoundCard | "expired" | null> {
  const parts = splitToken(token);
  if (!parts || !isSigned(purpose, parts.id, parts.signature)) return null;
  const row = await prisma.tripMember.findFirst({ where: { tripMemberId: parts.id, deletedAt: null } });
  if (!row) return null;
  const trip = await prisma.trip.findFirst({ where: { tripId: row.tripId, deletedAt: null } });
  const member = trip ? readMembers(trip).find((entry) => entry.id === row.memberKey) : undefined;
  if (!trip || !member) return null;
  const lastDay = trip.endDate ? trip.endDate.getTime() + CARD_DAYS_AFTER_TRIP * DAY_MS : null;
  return lastDay !== null && Date.now() > lastDay + DAY_MS ? "expired" : { trip, row, member };
}

/** What a stranger sees after scanning a meeting card: as little as lets them help. */
export async function getFinderView(token: string, clock: Clock): Promise<FinderView | "expired" | null> {
  const card = await findMemberLink("card", token);
  if (card === null || card === "expired") return card;
  const { trip, row, member } = card;
  const [rows, setting, open] = await Promise.all([
    prisma.tripMember.findMany({ where: { tripId: trip.tripId, deletedAt: null } }),
    prisma.tripSafetySetting.findFirst({ where: { tripId: trip.tripId, deletedAt: null } }),
    prisma.missingReport.findFirst({
      where: { missingTripMemberId: row.tripMemberId, status: { not: "FOUND" }, source: "FINDER", deletedAt: null },
    }),
  ]);
  const position = planPosition(readDays(trip), clock);
  const lead = rows.find((entry) => entry.userId === trip.userId);
  return {
    name: member.name.trim().split(/\s+/)[0] ?? "",
    ageGroup: member.ageGroup,
    languages: helpLanguages(await ensureCountries(trip)),
    place: position?.stop.title ?? "",
    until: position?.until ?? "",
    leadPhone: unseal(lead?.phoneNumberCipher ?? null),
    secondaryPhone: unseal(setting?.secondaryPhoneNumberCipher ?? null),
    told: open !== null,
  };
}

/**
 * A stranger's "I am with them". The member's open search becomes a finder's report, carrying the stranger's
 * location when they chose to send it; with no search open yet, one is started.
 */
export async function reportFromFinder(token: string, location: { latitude: number; longitude: number } | null): Promise<"told" | "expired" | "notFound"> {
  const card = await findMemberLink("card", token);
  if (card === null) return "notFound";
  if (card === "expired") return "expired";
  const { trip, row } = card;
  const shared = location ? { sharedLatitude: location.latitude, sharedLongitude: location.longitude, sharedAt: new Date() } : {};
  const updated = await updateOpenSearch(trip, row.tripMemberId, { source: "FINDER" satisfies ReportSource, ...shared });
  if (updated.count === 0) {
    await openSearch(trip, row.tripMemberId, null, "FINDER");
    if (location) await updateOpenSearch(trip, row.tripMemberId, shared);
  }
  announce(trip, await prisma.tripMember.findMany({ where: { tripId: trip.tripId, deletedAt: null } }), row, "FINDER", null);
  return "told";
}

/** The pack as one member sees it, for whoever holds that member's own link. Null once the link stops working. */
export async function getLinkPack(token: string): Promise<SafetyPack | null> {
  const found = await findMemberLink("help", token);
  return found === null || found === "expired" ? null : buildPack({ tripMemberId: found.row.tripMemberId }, found.trip);
}

/** One action from the holder of a member's own link (see LINK_ACTIONS). */
export async function applyLinkAction(token: string, action: SafetyAction): Promise<ActionResult> {
  const found = await findMemberLink("help", token);
  if (found === null || found === "expired") return "notFound";
  return applyAction({ tripMemberId: found.row.tripMemberId }, found.trip, action);
}

export type SafetyAlert = {
  tripId: string;
  tripName: string;
  ongoing: boolean;
  /** Searches under way on this trip, with who is being looked for. */
  searches: {
    memberId: string;
    name: string;
    ageGroup: AgeGroup;
    /** The member's place among those of the same age group who have no name, for "Adult 2". */
    order: number;
    source: ReportSource;
    status: ReportStatus;
    /** True when the viewer is the one being looked for. */
    forViewer: boolean;
    updatedAt: string;
  }[];
};

/** The trips under way that the viewer created or joined, and the searches open on any trip of theirs. */
export async function listSafetyAlerts(viewer: Viewer): Promise<SafetyAlert[]> {
  const clock = readClock(new Date());
  const today = new Date(`${clock.date}T00:00:00Z`);
  const trips = await prisma.trip.findMany({
    where: {
      state: { not: "DRAFT" },
      AND: [
        tripAccess(viewer),
        {
          OR: [
            { startDate: { lte: today }, endDate: { gte: today } },
            { missingReports: { some: { status: { not: "FOUND" }, deletedAt: null } } },
          ],
        },
      ],
    },
    include: {
      members: { where: { deletedAt: null } },
      missingReports: { where: { status: { not: "FOUND" }, deletedAt: null }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { startDate: "asc" },
    take: MAX_ALERT_TRIPS,
  });

  return trips.map((trip) => {
    const planned = readMembers(trip);
    const viewerRow = trip.members.find((row) => row.userId === viewer.userId);
    return {
      tripId: trip.tripId,
      tripName: trip.name,
      ongoing: statusOf(trip, clock) === "ongoing",
      searches: trip.missingReports.flatMap((report) => {
        const row = trip.members.find((entry) => entry.tripMemberId === report.missingTripMemberId);
        const member = row ? planned.find((entry) => entry.id === row.memberKey) : undefined;
        if (!row || !member) return [];
        const unnamed = planned.filter((entry) => entry.ageGroup === member.ageGroup && entry.name.trim() === "");
        const converted = toReport(report);
        return [
          {
            memberId: row.tripMemberId,
            name: member.name.trim(),
            ageGroup: member.ageGroup,
            order: unnamed.indexOf(member) + 1,
            source: converted.source,
            status: converted.status,
            forViewer: viewerRow?.tripMemberId === row.tripMemberId,
            updatedAt: converted.updatedAt,
          },
        ];
      }),
    };
  });
}
