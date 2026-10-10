import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { parseProfileDetails, saveProfile } from "@/lib/profile";
import { rateLimit } from "@/lib/rate-limit";

export async function PUT(request: NextRequest) {
  const limited = rateLimit(request, "profile-save");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const details = parseProfileDetails(await request.json().catch(() => null));
  if (!details) return NextResponse.json({ error: "The profile details are not valid" }, { status: 400 });

  const saved = await saveProfile(viewer, details);
  if (!saved) return NextResponse.json({ error: "That username is taken" }, { status: 409 });
  return NextResponse.json(details);
}
