import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { rateLimit } from "@/lib/rate-limit";
import { readSavedProfileInput } from "@/lib/saved-profiles/input";
import { createSavedProfile, listSavedProfiles } from "@/lib/saved-profiles/store";

/** The viewer's saved people, and the people of their past trips who could be saved. */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "saved-profiles-read");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await listSavedProfiles(viewer));
}

/** Saves a new person. */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "saved-profiles-create");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = await readSavedProfileInput(request);
  if (!input) return NextResponse.json({ error: "The profile needs a name" }, { status: 400 });

  const profile = await createSavedProfile(viewer, input);
  if (profile === "full") return NextResponse.json({ error: "No room for more saved profiles" }, { status: 409 });
  return NextResponse.json(profile, { status: 201 });
}
