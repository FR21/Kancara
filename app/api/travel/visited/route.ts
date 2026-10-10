import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { rateLimit } from "@/lib/rate-limit";
import { COUNTRIES, isCountryCode } from "@/lib/travel/countries";
import { replaceVisited } from "@/lib/travel/visited-store";

function readCodes(body: unknown): string[] | null {
  if (typeof body !== "object" || body === null || !("codes" in body) || !Array.isArray(body.codes)) return null;
  const codes: unknown[] = body.codes;
  if (codes.length > COUNTRIES.length || !codes.every(isCountryCode)) return null;
  return [...new Set(codes)];
}

/** Replaces the countries marked on the viewer's travel map. */
export async function PUT(request: NextRequest) {
  const limited = rateLimit(request, "travel-visited-save");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const codes = readCodes(await request.json().catch(() => null));
  if (!codes) return NextResponse.json({ error: "The list of countries is not valid" }, { status: 400 });

  await replaceVisited(viewer, codes);
  return NextResponse.json({ codes });
}
