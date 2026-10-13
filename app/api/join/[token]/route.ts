import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { rateLimit } from "@/lib/rate-limit";
import { getInvite, joinAsSelf, joinTrip, pickMember } from "@/lib/safety/store";

/** What an invite link opens, with or without an account: the trip's name and the members someone can pick. */
export async function GET(request: NextRequest, context: RouteContext<"/api/join/[token]">) {
  const limited = rateLimit(request, "join-read");
  if (limited) return limited;

  const { token } = await context.params;
  const invite = await getInvite(await currentViewer(), token);
  if (!invite) return NextResponse.json({ error: "This invite no longer works" }, { status: 404 });
  return NextResponse.json(invite);
}

/**
 * Joins the trip. `{ self: true }` adds the signed-in account to the group as a new member, so nobody has to have
 * added them first. `{ memberId }` picks a member the leader added: an account joins as that member; without an
 * account nothing is joined, and the answer carries that member's own link, which opens the help page as them.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/join/[token]">) {
  const limited = rateLimit(request, "join-write");
  if (limited) return limited;

  const body: unknown = await request.json().catch(() => null);
  const memberId = typeof body === "object" && body !== null && "memberId" in body ? body.memberId : null;
  const asSelf = typeof body === "object" && body !== null && "self" in body && body.self === true;

  const { token } = await context.params;
  const viewer = await currentViewer();
  if (asSelf) {
    if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const joined = await joinAsSelf(viewer, token);
    if (joined === "notFound") return NextResponse.json({ error: "This invite no longer works" }, { status: 404 });
    if (joined === "full") return NextResponse.json({ error: "This group is full" }, { status: 409 });
    return NextResponse.json({ joined: true });
  }
  if (typeof memberId !== "string") return NextResponse.json({ error: "Invalid member" }, { status: 400 });
  if (!viewer) {
    const helpToken = await pickMember(token, memberId);
    if (!helpToken) return NextResponse.json({ error: "This invite no longer works" }, { status: 404 });
    return NextResponse.json({ joined: false, helpToken });
  }
  const result = await joinTrip(viewer, token, memberId);
  if (result === "notFound") return NextResponse.json({ error: "This invite no longer works" }, { status: 404 });
  if (result === "taken") return NextResponse.json({ error: "Someone else already joined as this member" }, { status: 409 });
  return NextResponse.json({ joined: true });
}
