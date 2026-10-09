import { type NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { readTripInput } from "@/lib/trips/input";
import { createTrip, currentViewer, listActiveTrips, listHistoryTrips } from "@/lib/trips/store";

const MAX_QUERY_CHARS = 100;

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "trips-list");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  if (params.get("tab") !== "history") return NextResponse.json(await listActiveTrips(viewer));

  const year = Number(params.get("year"));
  return NextResponse.json(
    await listHistoryTrips(viewer, {
      query: (params.get("q") ?? "").slice(0, MAX_QUERY_CHARS),
      year: Number.isInteger(year) && year > 0 ? year : null,
    }),
  );
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "trips-create");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = await readTripInput(request);
  if (!input) return NextResponse.json({ error: "The trip is missing required details" }, { status: 400 });
  return NextResponse.json(await createTrip(viewer, input), { status: 201 });
}
