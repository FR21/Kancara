import {
  type AgeGroup,
  type CustomInterest,
  type InterestKey,
  type Member,
  type NeedKey,
  type WishLevel,
  parseDraftPatch,
} from "@/lib/plan-draft";

/** Someone the viewer travels with, kept so a new plan's group can be filled without asking everything again. */
export type SavedProfile = {
  id: string;
  name: string;
  /** How the person relates to the viewer, as typed: "Ibu", "Teman kantor". Empty when not given. */
  relationship: string;
  ageGroup: AgeGroup;
  age: number | null;
  needs: NeedKey[];
  customNeeds: string[];
  allergies: string;
  interests: Partial<Record<InterestKey, WishLevel>>;
  customInterests: CustomInterest[];
  notes: string;
};

export type SavedProfileDraft = Omit<SavedProfile, "id">;

/** Someone from the group of a past trip who is not saved yet, offered so they can be kept with one tap. */
export type SavedProfileSuggestion = { tripName: string; profile: SavedProfileDraft };

export type SavedProfileList = { profiles: SavedProfile[]; suggestions: SavedProfileSuggestion[] };

export const MAX_SAVED_PROFILES = 100;
export const MAX_PROFILE_NAME_CHARS = 40;
export const MAX_RELATIONSHIP_CHARS = 30;
export const MAX_ALLERGIES_CHARS = 120;
export const MAX_PROFILE_NOTES_CHARS = 300;
const MAX_TRIP_NAME_CHARS = 120;

export const EMPTY_PROFILE_DRAFT: SavedProfileDraft = {
  name: "",
  relationship: "",
  ageGroup: "adult",
  age: null,
  needs: [],
  customNeeds: [],
  allergies: "",
  interests: {},
  customInterests: [],
  notes: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanLine(value: unknown, limit: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, limit).trim() : "";
}

/**
 * Reads a profile sent by the browser, kept in the database, or taken from a trip's group. The member fields go
 * through the plan's own member reader, so a profile follows the same rules as a member of a plan: known needs
 * only, an age that fits its age group, and hand-typed entries cleaned and capped. Null without a name.
 */
export function parseSavedProfileDraft(value: unknown): SavedProfileDraft | null {
  if (!isRecord(value)) return null;
  const name = cleanLine(value.name, MAX_PROFILE_NAME_CHARS);
  const member = parseDraftPatch({ members: [value] }).members?.[0];
  if (name === "" || !member) return null;
  return {
    name,
    relationship: cleanLine(value.relationship, MAX_RELATIONSHIP_CHARS),
    ageGroup: member.ageGroup,
    age: member.age,
    needs: [...new Set(member.needs)],
    customNeeds: member.customNeeds,
    allergies: cleanLine(value.allergies, MAX_ALLERGIES_CHARS),
    interests: member.interests,
    customInterests: member.customInterests,
    notes: typeof value.notes === "string" ? value.notes.trim().slice(0, MAX_PROFILE_NOTES_CHARS).trim() : "",
  };
}

export function parseSavedProfile(value: unknown): SavedProfile | null {
  if (!isRecord(value) || typeof value.id !== "string" || value.id === "") return null;
  const draft = parseSavedProfileDraft(value);
  return draft ? { id: value.id, ...draft } : null;
}

export function parseSavedProfileSuggestion(value: unknown): SavedProfileSuggestion | null {
  if (!isRecord(value)) return null;
  const profile = parseSavedProfileDraft(value.profile);
  return profile ? { tripName: cleanLine(value.tripName, MAX_TRIP_NAME_CHARS), profile } : null;
}

/** A saved person as a new member of a plan. The member gets an id of its own, so one person can join many plans. */
export function savedProfileToMember(profile: SavedProfileDraft): Member {
  return {
    id: crypto.randomUUID(),
    name: profile.name,
    ageGroup: profile.ageGroup,
    age: profile.age,
    needs: [...profile.needs],
    customNeeds: [...profile.customNeeds],
    allergies: profile.allergies,
    interests: { ...profile.interests },
    customInterests: profile.customInterests.map((wish) => ({ ...wish })),
  };
}

/** The fields of a profile a member of a plan also has, as a member, for editing with the plan's own rules. */
export function profileToMember(profile: SavedProfileDraft): Member {
  return { ...savedProfileToMember(profile), id: "profile" };
}

export function hasNeeds(profile: SavedProfileDraft): boolean {
  return profile.needs.length > 0 || profile.customNeeds.length > 0;
}
