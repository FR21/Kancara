import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { rateLimit } from "@/lib/rate-limit";
import { readSavedProfileInput } from "@/lib/saved-profiles/input";
import { deleteSavedProfile, updateSavedProfile } from "@/lib/saved-profiles/store";

export async function PUT(request: NextRequest, context: RouteContext<"/api/saved-profiles/[id]">) {
  const limited = rateLimit(request, "saved-profiles-update");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = await readSavedProfileInput(request);
  if (!input) return NextResponse.json({ error: "The profile needs a name" }, { status: 400 });

  const { id } = await context.params;
  const profile = await updateSavedProfile(viewer, id, input);
  if (profile === "notFound") return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  return NextResponse.json(profile);
}

export async function DELETE(request: NextRequest, context: RouteContext<"/api/saved-profiles/[id]">) {
  const limited = rateLimit(request, "saved-profiles-delete");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const result = await deleteSavedProfile(viewer, id);
  if (result === "notFound") return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
