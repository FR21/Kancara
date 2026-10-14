import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { getObject } from "@/lib/object-storage";
import { rateLimit } from "@/lib/rate-limit";
import { memoryPhotoKey } from "@/lib/trips/memories";

const ONE_YEAR_S = 60 * 60 * 24 * 365;

/** A memory's photo. It is private, so it is served here, to the trip's group only, and not from the bucket. */
export async function GET(request: NextRequest, context: RouteContext<"/api/trips/[id]/memories/[memoryId]/photo">) {
  const limited = rateLimit(request, "trip-memories-photo");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, memoryId } = await context.params;
  const key = await memoryPhotoKey(viewer, id, memoryId);
  const stored = key ? await getObject(key) : null;
  if (!stored) return NextResponse.json({ error: "No photo" }, { status: 404 });

  return new NextResponse(stored.body, {
    headers: {
      "Content-Type": stored.headers.get("content-type") ?? "application/octet-stream",
      // A memory's photo never changes: a new photo is a new memory with its own address.
      "Cache-Control": `private, max-age=${ONE_YEAR_S}, immutable`,
    },
  });
}
