import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { rateLimit } from "@/lib/rate-limit";
import { readSafetyAction } from "@/lib/safety/action";
import { applySafetyAction, getSafetyPack } from "@/lib/safety/store";

/** The safety pack of a trip: its members and how to reach them, the meeting point, the contacts, the searches. */
export async function GET(request: NextRequest, context: RouteContext<"/api/trips/[id]/safety">) {
  const limited = rateLimit(request, "safety-read");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const pack = await getSafetyPack(viewer, id);
  if (!pack) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(pack);
}

/** One change to a trip's safety pack (see SafetyAction). Answers with the pack as it stands afterwards. */
export async function POST(request: NextRequest, context: RouteContext<"/api/trips/[id]/safety">) {
  const limited = rateLimit(request, "safety-write");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const action = readSafetyAction(await request.json().catch(() => null));
  if (!action) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const { id } = await context.params;
  const result = await applySafetyAction(viewer, id, action);
  if (result === "notFound") return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (result === "invalid") return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  if (result === "taken") return NextResponse.json({ error: "Someone else already joined as this member" }, { status: 409 });
  return NextResponse.json(result);
}
