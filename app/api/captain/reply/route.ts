import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { captainAgentReply } from "@/lib/agents/tripPlanner";

export async function POST(req: Request) {
  const limited = rateLimit(req, "captain-reply");
  if (limited) return limited;

  try {
    const body = await req.json();
    const reply = await captainAgentReply(body);
    return NextResponse.json(reply);
  } catch (error: unknown) {
    console.error("Captain Reply Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
