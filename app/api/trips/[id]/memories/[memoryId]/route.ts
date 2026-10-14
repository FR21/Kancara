import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { rateLimit } from "@/lib/rate-limit";
import { removeTripMemory } from "@/lib/trips/memories";

/** Takes a memory out of the album. Only whoever recorded it, or the organizer, may. */
export async function DELETE(request: NextRequest, context: RouteContext<"/api/trips/[id]/memories/[memoryId]">) {
  const limited = rateLimit(request, "trip-memories-delete");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, memoryId } = await context.params;
  const result = await removeTripMemory(viewer, id, memoryId);
  if (result === "notFound") return NextResponse.json({ error: "Memory not found" }, { status: 404 });
  if (result === "refused") return NextResponse.json({ error: "Only its author or the organizer can remove it" }, { status: 403 });
  return new NextResponse(null, { status: 204 });
}
