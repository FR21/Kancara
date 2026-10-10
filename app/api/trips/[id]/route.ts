import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { rateLimit } from "@/lib/rate-limit";
import { readTripInput } from "@/lib/trips/input";
import { deleteTrip, getTripPlan, updateTrip } from "@/lib/trips/store";

export async function GET(request: NextRequest, context: RouteContext<"/api/trips/[id]">) {
  const limited = rateLimit(request, "trips-read");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const plan = await getTripPlan(viewer, id);
  if (!plan) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PUT(request: NextRequest, context: RouteContext<"/api/trips/[id]">) {
  const limited = rateLimit(request, "trips-update");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = await readTripInput(request);
  if (!input) return NextResponse.json({ error: "The trip is missing required details" }, { status: 400 });

  const { id } = await context.params;
  const card = await updateTrip(viewer, id, input);
  if (!card) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(card);
}

export async function DELETE(request: NextRequest, context: RouteContext<"/api/trips/[id]">) {
  const limited = rateLimit(request, "trips-delete");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const result = await deleteTrip(viewer, id);
  if (result === "notFound") return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (result === "forbidden") {
    return NextResponse.json({ error: "Only the organizer can delete a trip" }, { status: 403 });
  }
  return new NextResponse(null, { status: 204 });
}
