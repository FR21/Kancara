import { type NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { readSafetyAction } from "@/lib/safety/action";
import { applyLinkAction, getLinkPack } from "@/lib/safety/store";

// A member's own link stands in for an account here: whoever holds it reads the trip's safety pack as that member
// and can ask for help and answer. The token is the only thing checked, so neither answer says more than a
// stranger with a meeting card could work out, beyond what the group already shares with each other.

/** The safety pack as the member this link belongs to sees it. */
export async function GET(request: NextRequest, context: RouteContext<"/api/help/[token]">) {
  const limited = rateLimit(request, "help-read");
  if (limited) return limited;

  const { token } = await context.params;
  const pack = await getLinkPack(token);
  if (!pack) return NextResponse.json({ error: "This link no longer works" }, { status: 404 });
  return NextResponse.json(pack);
}

/** One action from that member (see SafetyAction): asking for help, answering, or their own contact. */
export async function POST(request: NextRequest, context: RouteContext<"/api/help/[token]">) {
  const limited = rateLimit(request, "help-write");
  if (limited) return limited;

  const action = readSafetyAction(await request.json().catch(() => null));
  if (!action) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const { token } = await context.params;
  const result = await applyLinkAction(token, action);
  if (result === "notFound") return NextResponse.json({ error: "This link no longer works" }, { status: 404 });
  if (result === "invalid" || result === "taken") return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  return NextResponse.json(result);
}
