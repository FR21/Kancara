import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimit(request, "captain-invite");
  if (limited) return limited;

  // Hanya mengembalikan URL mock untuk sekarang
  return NextResponse.json({ url: "https://kancara.app/invite/12345" });
}
