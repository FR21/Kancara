import { type NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

// What stands at a point, for filling in a meeting point's name and address once its position is known. The answer
// comes from OpenStreetMap's Nominatim, which needs no key; its data may be kept, unlike a place looked up from
// Google. Nominatim asks for few requests and to be told who is asking, so answers are remembered here for a
// while and the request names the app.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "Kancara/1.0 (group travel planner)";
const TIMEOUT_MS = 6000;
const MAX_REMEMBERED = 300;
// Four decimals is about eleven metres: close enough that two presses on the same spot share one answer.
const PRECISION = 4;

type Described = { label: string; note: string };
const remembered = new Map<string, Described>();

function remember(key: string, value: Described) {
  if (remembered.size >= MAX_REMEMBERED) remembered.delete(remembered.keys().next().value ?? key);
  remembered.set(key, value);
}

/** `?lat=&lng=&lang=`: the point's short name and the rest of its address. 404 when nothing is known there. */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "geocode-reverse");
  if (limited) return limited;

  const params = request.nextUrl.searchParams;
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lng"));
  if (!params.get("lat") || !params.get("lng") || !(Math.abs(latitude) <= 90) || !(Math.abs(longitude) <= 180)) {
    return NextResponse.json({ error: "Invalid point" }, { status: 400 });
  }
  const language = params.get("lang") === "en" ? "en" : "id";
  const key = `${latitude.toFixed(PRECISION)},${longitude.toFixed(PRECISION)},${language}`;
  const known = remembered.get(key);
  if (known) return NextResponse.json(known);

  try {
    const query = new URLSearchParams({
      format: "jsonv2",
      lat: String(latitude),
      lon: String(longitude),
      zoom: "18",
      "accept-language": language,
    });
    const reply = await fetch(`${NOMINATIM_URL}?${query}`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const data = (await reply.json()) as { name?: unknown; display_name?: unknown };
    const address = typeof data.display_name === "string" ? data.display_name : "";
    if (!reply.ok || address === "") return NextResponse.json({ error: "Nothing is known at this point" }, { status: 404 });

    // The place's own name leads when it has one; otherwise the first part of the address does.
    const parts = address.split(",").map((part) => part.trim());
    const label = typeof data.name === "string" && data.name.trim() !== "" ? data.name.trim() : parts[0];
    const described = { label, note: (parts[0] === label ? parts.slice(1) : parts).join(", ") };
    remember(key, described);
    return NextResponse.json(described);
  } catch {
    return NextResponse.json({ error: "The address could not be looked up" }, { status: 502 });
  }
}
