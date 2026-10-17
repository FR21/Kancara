import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { MAX_MEMORY_PHOTO_BYTES } from "@/lib/client/trip-memories";
import { rateLimit } from "@/lib/rate-limit";
import { readInput, readPhoto, removeTripMemory, updateTripMemory } from "@/lib/trips/memories";

const MAX_REQUEST_BYTES = MAX_MEMORY_PHOTO_BYTES + 64 * 1024;

/** Updates a memory in the album. Only whoever recorded it, or the organizer, may. */
export async function PATCH(request: NextRequest, context: RouteContext<"/api/trips/[id]/memories/[memoryId]">) {
  const limited = rateLimit(request, "trip-memories-save");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (Number(request.headers.get("content-length")) > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "The photo is too large" }, { status: 413 });
  }

  const form = await request.formData().catch(() => null);
  const input = form ? readInput(form) : null;
  if (!form || !input) return NextResponse.json({ error: "The memory is missing required details" }, { status: 400 });

  const { photo, error: photoError } = await readPhoto(form);
  if (photoError) return NextResponse.json({ error: photoError.message }, { status: photoError.status });

  const removePhoto = form.get("removePhoto") === "true";
  const { id, memoryId } = await context.params;

  const result = await updateTripMemory(viewer, id, memoryId, input, photo, removePhoto);
  if (result === null) return NextResponse.json({ error: "Memory not found" }, { status: 404 });
  if (result === "refused") return NextResponse.json({ error: "Only its author or the organizer can edit it" }, { status: 403 });

  return NextResponse.json(result);
}

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
