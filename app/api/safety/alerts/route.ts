import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { rateLimit } from "@/lib/rate-limit";
import { listSafetyAlerts } from "@/lib/safety/store";

/**
 * The viewer's trips that are under way, and the searches open on any of their trips. The app asks for it every
 * few seconds while it is open, which is how a search reaches the rest of the group. Someone signed out gets an
 * empty list, not an error, since every page asks.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "safety-alerts");
  if (limited) return limited;

  const viewer = await currentViewer();
  return NextResponse.json({ signedIn: viewer !== null, alerts: viewer ? await listSafetyAlerts(viewer) : [] });
}
