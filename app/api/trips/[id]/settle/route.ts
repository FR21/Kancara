import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { rateLimit } from "@/lib/rate-limit";
import { updateTripSettledMap } from "@/lib/trips/memories";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, "trips-settle-update");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();
    const settledMap = (body && typeof body.settledMap === "object" && body.settledMap !== null) ? body.settledMap : {};

    const updated = await updateTripSettledMap(viewer, id, settledMap);
    if (!updated) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    return NextResponse.json({ success: true, settledMap });
  } catch (err) {
    console.error("Error updating settled status:", err);
    return NextResponse.json({ error: "Gagal memperbarui status lunas" }, { status: 500 });
  }
}
