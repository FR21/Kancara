import { NextResponse } from "next/server";

export async function POST(_req: Request) {
  // Hanya mengembalikan URL mock untuk sekarang
  return NextResponse.json({ url: "https://kancara.app/invite/12345" });
}
