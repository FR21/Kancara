import { type NextRequest, NextResponse } from "next/server";
import { currentRate } from "@/lib/exchange-rate";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "exchange-rate");
  if (limited) return limited;

  return NextResponse.json(await currentRate());
}
