import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimit(request, "captain-invite");
  if (limited) return limited;

  // Invitations are not built yet, so every request gets the same stand-in address.
  return NextResponse.json({ url: "https://kancara.app/invite/12345" });
}
