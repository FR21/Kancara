import { type NextRequest, NextResponse } from "next/server";
import { readTripInput } from "@/lib/trips/input";
import { currentViewer, deleteTrip, getTripPlan, updateTrip } from "@/lib/trips/store";

export async function GET(_request: NextRequest, context: RouteContext<"/api/trips/[id]">) {
  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const plan = getTripPlan(viewer, id);
  if (!plan) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PUT(request: NextRequest, context: RouteContext<"/api/trips/[id]">) {
  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = await readTripInput(request);
  if (!input) return NextResponse.json({ error: "The trip is missing required details" }, { status: 400 });

  const { id } = await context.params;
  const card = updateTrip(viewer, id, input);
  if (!card) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(card);
}

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
