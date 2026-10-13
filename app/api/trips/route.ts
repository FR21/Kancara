import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { rateLimit } from "@/lib/rate-limit";
import { keepPlanContacts } from "@/lib/safety/store";
import { readTripInput } from "@/lib/trips/input";
import { type Page, createTrip, listActiveTrips, listHistoryTrips } from "@/lib/trips/store";

const MAX_QUERY_CHARS = 100;
const PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

// Both lists come a page at a time. A request may ask for a different page size, up to a ceiling.
function readPage(params: URLSearchParams): Page {
  const limit = Number(params.get("limit"));
  const offset = Number(params.get("offset"));
  return {
    limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, MAX_PAGE_SIZE) : PAGE_SIZE,
    offset: Number.isInteger(offset) && offset > 0 ? offset : 0,
  };
}

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "trips-list");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const page = readPage(params);
  if (params.get("tab") !== "history") return NextResponse.json(await listActiveTrips(viewer, page));

  const year = Number(params.get("year"));
  return NextResponse.json(
    await listHistoryTrips(
      viewer,
      {
        query: (params.get("q") ?? "").slice(0, MAX_QUERY_CHARS),
        year: Number.isInteger(year) && year > 0 ? year : null,
      },
      page,
    ),
  );
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "trips-create");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = await readTripInput(request);
  if (!input) return NextResponse.json({ error: "The trip is missing required details" }, { status: 400 });
  const card = await createTrip(viewer, input);
  await keepPlanContacts(viewer, card.id, input.contacts);
  return NextResponse.json(card, { status: 201 });
}
