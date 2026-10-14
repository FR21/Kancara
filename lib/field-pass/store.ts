import "server-only";
import { Prisma } from "@prisma/client";
import type { Viewer } from "@/lib/account";
import { writeFieldPass } from "@/lib/agents/fieldPassAgent";
import type { Locale } from "@/lib/locale";
import { MESSAGES } from "@/lib/messages";
import { EMPTY_DRAFT, NEED_CATEGORIES, parsePlanDraft } from "@/lib/plan-draft";
import { prisma } from "@/lib/prisma";
import { seal, unseal } from "@/lib/secret-box";
import { type SharedFieldPass, parseFieldPass } from "./pass";

// One pass per trip and language, shared by everyone on the trip: the first member to open it has it written,
// the rest read that one. It is written again only when someone asks. The pass names the group's allergies, so
// it is sealed like the other health notes.

export type GenerateResult = SharedFieldPass | "notFound" | "noDestination" | "tooSoon";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNIQUE_VIOLATION = "P2002";
// Writing a pass costs a model call, so the same pass is not written again within a few minutes.
const REWRITE_AFTER_MS = 5 * 60 * 1000;

type TripSource = { tripId: string; workspaceId: string; name: string; destinations: string[]; planDraft: Prisma.JsonValue };

/** A trip the viewer created or joined as a member. */
async function findTrip(viewer: Viewer, tripId: string): Promise<TripSource | null> {
  if (!UUID.test(tripId)) return null;
  return prisma.trip.findFirst({
    where: {
      tripId,
      deletedAt: null,
      OR: [{ workspaceId: viewer.workspaceId }, { members: { some: { userId: viewer.userId, deletedAt: null } } }],
    },
    select: { tripId: true, workspaceId: true, name: true, destinations: true, planDraft: true },
  });
}

/** The pass is kept in the trip's workspace, so every member reads the same row whoever's workspace they are in. */
function findStored(trip: TripSource, locale: Locale) {
  return prisma.tripFieldPass.findFirst({
    where: { tripId: trip.tripId, workspaceId: trip.workspaceId, locale, deletedAt: null },
  });
}

function toShared(record: { payload: Prisma.JsonValue; generatedAt: Date }): SharedFieldPass | null {
  const payload = record.payload;
  const sealed = typeof payload === "object" && payload !== null && !Array.isArray(payload) ? payload.sealed : null;
  const text = unseal(typeof sealed === "string" ? sealed : null);
  if (!text) return null;
  const pass = parseFieldPass(JSON.parse(text));
  return pass ? { pass, generatedAt: record.generatedAt.toISOString() } : null;
}

function describeTrip(trip: TripSource, locale: Locale) {
  const draft = parsePlanDraft(trip.planDraft) ?? EMPTY_DRAFT;
  const needLabels = MESSAGES[locale].plan.needs;
  const dietNeeds: readonly string[] = NEED_CATEGORIES.diet;
  const restrictions = draft.members.flatMap((member) => [
    ...member.needs.filter((need) => dietNeeds.includes(need)).map((need) => needLabels[need]),
    ...member.customNeeds,
    member.allergies,
  ]);
  return {
    destination: (trip.destinations.length > 0 ? trip.destinations : draft.destinations).filter(Boolean).join(", "),
    memberCount: Math.max(1, draft.members.length),
    foodRestrictions: [...new Set(restrictions.map((entry) => entry.trim()).filter(Boolean))],
    lodging: draft.extras.lodging.trim(),
  };
}

/** The group's pass in this language. Null when none was written yet; "notFound" when the trip is not the viewer's. */
export async function readFieldPass(viewer: Viewer, tripId: string, locale: Locale): Promise<SharedFieldPass | null | "notFound"> {
  const trip = await findTrip(viewer, tripId);
  if (!trip) return "notFound";
  const stored = await findStored(trip, locale);
  return stored ? toShared(stored) : null;
}

/**
 * The group's pass, written now when there is none yet or when `rewrite` asks for a new one. Two members asking at
 * once both get the pass that was saved first.
 */
export async function generateFieldPass(viewer: Viewer, tripId: string, locale: Locale, rewrite: boolean): Promise<GenerateResult> {
  const trip = await findTrip(viewer, tripId);
  if (!trip) return "notFound";
  const stored = await findStored(trip, locale);
  const kept = stored ? toShared(stored) : null;
  if (stored && kept && !rewrite) return kept;
  if (stored && kept && Date.now() - stored.generatedAt.getTime() < REWRITE_AFTER_MS) return "tooSoon";

  const request = describeTrip(trip, locale);
  if (!request.destination) return "noDestination";
  const pass = await writeFieldPass({ ...request, locale });
  const payload = { sealed: seal(JSON.stringify(pass)) };
  const generatedAt = new Date();

  if (stored) {
    await prisma.tripFieldPass.update({ where: { tripFieldPassId: stored.tripFieldPassId }, data: { payload, generatedAt } });
    return { pass, generatedAt: generatedAt.toISOString() };
  }
  try {
    await prisma.tripFieldPass.create({
      data: { workspaceId: trip.workspaceId, tripId: trip.tripId, locale, payload, generatedAt },
    });
    return { pass, generatedAt: generatedAt.toISOString() };
  } catch (caught) {
    if (!(caught instanceof Prisma.PrismaClientKnownRequestError) || caught.code !== UNIQUE_VIOLATION) throw caught;
    const winner = await findStored(trip, locale);
    const shared = winner ? toShared(winner) : null;
    if (!shared) throw caught;
    return shared;
  }
}
