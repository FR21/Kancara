import { NextResponse } from "next/server";
import { suggestPacking } from "@/lib/agents/packingAgent";
import { rateLimit } from "@/lib/rate-limit";

/** Captain's additions to a group's packing list. The list stands without them, so a failure here is only a 502. */
export async function POST(request: Request) {
  const limited = rateLimit(request, "captain-packing");
  if (limited) return limited;

  try {
    return NextResponse.json({ items: await suggestPacking(await request.json()) });
  } catch (error: unknown) {
    console.error("Captain packing error:", error);
    return NextResponse.json({ error: "Captain could not read the trip" }, { status: 502 });
  }
}
