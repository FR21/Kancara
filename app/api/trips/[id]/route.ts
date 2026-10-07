import { type NextRequest, NextResponse } from "next/server";
import { currentViewer, deleteTrip } from "@/lib/trips/store";

export async function DELETE(_request: NextRequest, context: RouteContext<"/api/trips/[id]">) {
  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const result = deleteTrip(viewer, id);
  if (result === "notFound") return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (result === "forbidden") {
    return NextResponse.json({ error: "Only the organizer can delete a trip" }, { status: 403 });
  }
  return new NextResponse(null, { status: 204 });
}
