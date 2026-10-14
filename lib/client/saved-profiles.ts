import { withTimeout } from "@/lib/client/abort";
import {
  type SavedProfile,
  type SavedProfileDraft,
  type SavedProfileList,
  parseSavedProfile,
  parseSavedProfileSuggestion,
} from "@/lib/saved-profiles/profile";

export class SavedProfilesError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
  }
}

/** Why a request failed, in the words a screen picks its message by. */
export type SavedProfilesFailure = "full" | "offline" | "failed";

const BASE_URL = "/api/saved-profiles";
const REQUEST_TIMEOUT_MS = 15000;
const RATE_LIMIT_WAIT_MS = 1100;
// Before profiles were kept in the database, every browser held a full copy of them, allergies and notes
// included. That copy is no longer read, so it is removed from any device that still has it.
const LEGACY_STORAGE_KEY = "kancara_saved_member_profiles_v1";

export function forgetLegacyProfileCopy(): void {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // No storage here: there is no copy to remove.
  }
}

export function describeFailure(error: unknown): SavedProfilesFailure {
  if (error instanceof SavedProfilesError && error.status === 409) return "full";
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  return "failed";
}

async function send(path: string, init: RequestInit, signal?: AbortSignal, retried = false): Promise<Response> {
  const response = await fetch(`${BASE_URL}${path}`, { ...init, signal: withTimeout(signal, REQUEST_TIMEOUT_MS) });
  // Every API allows three requests a second; one busy moment is waited out, not shown as a failure.
  if (response.status === 429 && !retried) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
    return send(path, init, signal, true);
  }
  if (!response.ok) throw new SavedProfilesError(`Saved profiles request failed with ${response.status}`, response.status);
  return response;
}

function readProfile(value: unknown): SavedProfile {
  const profile = parseSavedProfile(value);
  if (!profile) throw new SavedProfilesError("Invalid saved profile response");
  return profile;
}

function readList(value: unknown): SavedProfileList {
  if (typeof value !== "object" || value === null) throw new SavedProfilesError("Invalid saved profiles response");
  const { profiles, suggestions } = value as Record<string, unknown>;
  return {
    profiles: Array.isArray(profiles) ? profiles.flatMap((entry) => parseSavedProfile(entry) ?? []) : [],
    suggestions: Array.isArray(suggestions) ? suggestions.flatMap((entry) => parseSavedProfileSuggestion(entry) ?? []) : [],
  };
}

function jsonBody(draft: SavedProfileDraft): RequestInit {
  return { headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) };
}

export const savedProfiles = {
  async list(signal: AbortSignal): Promise<SavedProfileList> {
    const response = await send("", { method: "GET" }, signal);
    return readList(await response.json());
  },

  async create(draft: SavedProfileDraft): Promise<SavedProfile> {
    const response = await send("", { ...jsonBody(draft), method: "POST" });
    return readProfile(await response.json());
  },

  async update(id: string, draft: SavedProfileDraft): Promise<SavedProfile> {
    const response = await send(`/${encodeURIComponent(id)}`, { ...jsonBody(draft), method: "PUT" });
    return readProfile(await response.json());
  },

  async remove(id: string): Promise<void> {
    await send(`/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};
