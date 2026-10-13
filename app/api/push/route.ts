import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { isPushToken, pushKey, removePushToken, savePushToken } from "@/lib/push";
import { rateLimit } from "@/lib/rate-limit";

async function readToken(request: NextRequest): Promise<{ token: string; locale: string } | null> {
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || !("token" in body) || !isPushToken(body.token)) return null;
  return { token: body.token, locale: "locale" in body && typeof body.locale === "string" ? body.locale : "" };
}

/** The key a browser needs to ask for a push token. It is public by design. */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "push-key");
  if (limited) return limited;
  return NextResponse.json({ key: pushKey() });
}

/** Turns notifications on for this device: `{ token, locale }`. */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "push-save");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = await readToken(request);
  if (!input) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  await savePushToken(viewer, input.token, input.locale);
  return NextResponse.json({ saved: true });
}

/** Turns them off again for this device: `{ token }`. */
export async function DELETE(request: NextRequest) {
  const limited = rateLimit(request, "push-remove");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = await readToken(request);
  if (!input) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  await removePushToken(viewer, input.token);
  return new NextResponse(null, { status: 204 });
}
