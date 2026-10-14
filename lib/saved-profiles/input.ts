import "server-only";
import { type SavedProfileDraft, parseSavedProfileDraft } from "./profile";

/** Reads a profile sent by the browser. Null when the body is not one, or names nobody. */
export async function readSavedProfileInput(request: Request): Promise<SavedProfileDraft | null> {
  const body: unknown = await request.json().catch(() => null);
  return parseSavedProfileDraft(body);
}
