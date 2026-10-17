import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { MAX_MEMORY_PHOTO_BYTES } from "@/lib/client/trip-memories";
import { rateLimit } from "@/lib/rate-limit";
import { addTripMemory, listTripMemories, readInput, readPhoto } from "@/lib/trips/memories";

// A multipart request carries a little more than the file itself.
const MAX_REQUEST_BYTES = MAX_MEMORY_PHOTO_BYTES + 64 * 1024;

/** One page of a trip's album: `?offset=` from the page before, `?author=` for one person's memories only. */
export async function GET(request: NextRequest, context: RouteContext<"/api/trips/[id]/memories">) {
  const limited = rateLimit(request, "trip-memories-read");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const params = request.nextUrl.searchParams;
  const offset = Number(params.get("offset") ?? 0);
  if (!Number.isInteger(offset) || offset < 0) return NextResponse.json({ error: "Invalid offset" }, { status: 400 });

  const page = await listTripMemories(viewer, id, offset, params.get("author"));
  if (!page) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(page);
}

/** Adds a memory, sent as a form: place, day, note, an optional rating and author, and an optional photo. */
export async function POST(request: NextRequest, context: RouteContext<"/api/trips/[id]/memories">) {
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

  const { id } = await context.params;
  const memory = await addTripMemory(viewer, id, input, photo);
  if (!memory) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(memory, { status: 201 });
}
