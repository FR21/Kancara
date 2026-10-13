import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getObject } from "@/lib/storage";

const ONE_YEAR_S = 60 * 60 * 24 * 365;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, "trips-photo-read");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const key = request.nextUrl.searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  // Security check: Key must belong strictly to this trip's memories or receipts
  const validMemoriesPrefix = `trips/${id}/memories/`;
  const validReceiptsPrefix = `trips/${id}/receipts/`;
  if (!key.startsWith(validMemoriesPrefix) && !key.startsWith(validReceiptsPrefix)) {
    return NextResponse.json({ error: "Forbidden access to this file key" }, { status: 403 });
  }

  // Verify viewer has access to the trip
  const trip = await prisma.trip.findFirst({
    where: { tripId: id, workspaceId: viewer.workspaceId, deletedAt: null },
    select: { tripId: true },
  });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const stored = await getObject(key);
  if (!stored) return NextResponse.json({ error: "Photo not found in storage" }, { status: 404 });

  return new NextResponse(stored.body, {
    headers: {
      "Content-Type": stored.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": `private, max-age=${ONE_YEAR_S}, immutable`,
    },
  });
}
