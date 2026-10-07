import { type NextRequest, NextResponse } from "next/server";
import { currentViewer, listActiveTrips, listHistoryTrips } from "@/lib/trips/store";

const MAX_QUERY_CHARS = 100;

export async function GET(request: NextRequest) {
  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  if (params.get("tab") !== "history") return NextResponse.json(listActiveTrips(viewer));

  const year = Number(params.get("year"));
  return NextResponse.json(
    listHistoryTrips(viewer, {
      query: (params.get("q") ?? "").slice(0, MAX_QUERY_CHARS),
      year: Number.isInteger(year) && year > 0 ? year : null,
    }),
  );
}
