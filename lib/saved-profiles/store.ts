import "server-only";
import type { SavedMemberProfile as ProfileRecord } from "@prisma/client";
import type { Viewer } from "@/lib/account";
import { parsePlanDraft, sameText } from "@/lib/plan-draft";
import { prisma } from "@/lib/prisma";
import { seal, unseal } from "@/lib/secret-box";
import {
  type SavedProfile,
  type SavedProfileDraft,
  type SavedProfileList,
  type SavedProfileSuggestion,
  MAX_SAVED_PROFILES,
  parseSavedProfile,
  parseSavedProfileDraft,
} from "./profile";

export type CreateResult = SavedProfile | "full";
export type UpdateResult = SavedProfile | "notFound";
export type DeleteResult = "deleted" | "notFound";

// Every query here is limited to the viewer's workspace and skips rows that were deleted. Allergies and notes are
// health and personal details, so they are sealed before they reach the database and opened only on the way out.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Suggestions come from the most recently changed trips; older groups are rarely the next one.
const SUGGESTION_TRIPS = 20;
const MAX_SUGGESTIONS = 12;

function sealOrNull(text: string): string | null {
  return text === "" ? null : seal(text);
}

// A stored row goes through the same reader as a profile arriving from the browser, so a row written by an
// older version of the app still has every field the screens read.
function toProfile(record: ProfileRecord): SavedProfile | null {
  return parseSavedProfile({
    id: record.savedMemberProfileId,
    name: record.name,
    relationship: record.relationship,
    ageGroup: record.ageGroup,
    age: record.age,
    needs: record.needs,
    customNeeds: record.customNeeds,
    allergies: unseal(record.allergiesCipher) ?? "",
    interests: record.interests,
    customInterests: record.customInterests,
    notes: unseal(record.notesCipher) ?? "",
  });
}

function toColumns(draft: SavedProfileDraft) {
  return {
    name: draft.name,
    relationship: draft.relationship,
    ageGroup: draft.ageGroup,
    age: draft.age,
    needs: draft.needs,
    customNeeds: draft.customNeeds,
    allergiesCipher: sealOrNull(draft.allergies),
    interests: draft.interests,
    customInterests: draft.customInterests,
    notesCipher: sealOrNull(draft.notes),
  };
}

function scope(viewer: Viewer, id: string) {
  return { savedMemberProfileId: id, workspaceId: viewer.workspaceId, deletedAt: null };
}

/**
 * The people of past trips' groups who are not saved yet, worked out on every visit rather than kept: a trip
 * that changes or goes away changes what is offered.
 */
async function suggestFromTrips(viewer: Viewer, profiles: SavedProfile[]): Promise<SavedProfileSuggestion[]> {
  const trips = await prisma.trip.findMany({
    where: { workspaceId: viewer.workspaceId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: SUGGESTION_TRIPS,
    select: { name: true, planDraft: true },
  });
  const suggestions: SavedProfileSuggestion[] = [];
  const known = (name: string) =>
    profiles.some((profile) => sameText(profile.name, name)) ||
    suggestions.some((suggestion) => sameText(suggestion.profile.name, name));

  for (const trip of trips) {
    for (const member of parsePlanDraft(trip.planDraft)?.members ?? []) {
      if (suggestions.length >= MAX_SUGGESTIONS) return suggestions;
      const draft = parseSavedProfileDraft(member);
      if (draft && !known(draft.name)) suggestions.push({ tripName: trip.name, profile: draft });
    }
  }
  return suggestions;
}

export async function listSavedProfiles(viewer: Viewer): Promise<SavedProfileList> {
  const records = await prisma.savedMemberProfile.findMany({
    where: { workspaceId: viewer.workspaceId, deletedAt: null },
    orderBy: { name: "asc" },
    take: MAX_SAVED_PROFILES,
  });
  const profiles = records.flatMap((record) => toProfile(record) ?? []);
  return { profiles, suggestions: await suggestFromTrips(viewer, profiles) };
}

/** Keeps a new person. "full" when the address book already holds as many as it may. */
export async function createSavedProfile(viewer: Viewer, draft: SavedProfileDraft): Promise<CreateResult> {
  // The count and the insert run together, so two quick saves cannot both slip past the limit.
  const record = await prisma.$transaction(async (transaction) => {
    const kept = await transaction.savedMemberProfile.count({
      where: { workspaceId: viewer.workspaceId, deletedAt: null },
    });
    if (kept >= MAX_SAVED_PROFILES) return null;
    return transaction.savedMemberProfile.create({
      data: { ...toColumns(draft), workspaceId: viewer.workspaceId, userId: viewer.userId },
    });
  });
  if (!record) return "full";
  return toProfile(record) ?? "full";
}

export async function updateSavedProfile(viewer: Viewer, id: string, draft: SavedProfileDraft): Promise<UpdateResult> {
  if (!UUID.test(id)) return "notFound";
  const found = await prisma.savedMemberProfile.findFirst({ where: scope(viewer, id), select: { savedMemberProfileId: true } });
  if (!found) return "notFound";
  const record = await prisma.savedMemberProfile.update({
    where: { savedMemberProfileId: found.savedMemberProfileId },
    data: toColumns(draft),
  });
  return toProfile(record) ?? "notFound";
}

export async function deleteSavedProfile(viewer: Viewer, id: string): Promise<DeleteResult> {
  if (!UUID.test(id)) return "notFound";
  const { count } = await prisma.savedMemberProfile.updateMany({
    where: scope(viewer, id),
    data: { deletedAt: new Date() },
  });
  return count === 0 ? "notFound" : "deleted";
}
