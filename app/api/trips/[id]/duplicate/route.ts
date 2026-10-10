import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { rateLimit } from "@/lib/rate-limit";
import { duplicateTrip } from "@/lib/trips/store";

const MAX_NAME_CHARS = 120;

async function readName(request: NextRequest): Promise<string> {
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || !("name" in body)) return "";
    return typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME_CHARS) : "";
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest, context: RouteContext<"/api/trips/[id]/duplicate">) {
  const limited = rateLimit(request, "trips-duplicate");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const copy = await duplicateTrip(viewer, id, await readName(request));
  if (!copy) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(copy, { status: 201 });
}
