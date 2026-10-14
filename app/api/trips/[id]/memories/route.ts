import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { MAX_MEMORY_PHOTO_BYTES } from "@/lib/client/trip-memories";
import { rateLimit } from "@/lib/rate-limit";
import {
  type MemoryInput,
  type MemoryPhoto,
  addTripMemory,
  listTripMemories,
  MAX_AUTHOR_NAME,
  MAX_DAY_NUMBER,
  MAX_NOTE,
  MAX_PLACE_TITLE,
} from "@/lib/trips/memories";

// A multipart request carries a little more than the file itself.
const MAX_REQUEST_BYTES = MAX_MEMORY_PHOTO_BYTES + 64 * 1024;

// The kind of image is read from the file's first bytes, never from the name or the type the browser claims.
const KINDS = [
  { extension: "png", type: "image/png", matches: (bytes: Uint8Array) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]) },
  { extension: "jpg", type: "image/jpeg", matches: (bytes: Uint8Array) => startsWith(bytes, [0xff, 0xd8, 0xff]) },
  {
    extension: "webp",
    type: "image/webp",
    matches: (bytes: Uint8Array) =>
      startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50]),
  },
];

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function readText(form: FormData, name: string, limit: number): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function readInput(form: FormData): MemoryInput | null {
  const placeTitle = readText(form, "placeTitle", MAX_PLACE_TITLE);
  const dayNumber = Number(form.get("dayNumber"));
  const rawRating = form.get("rating");
  const rating = rawRating === null ? null : Number(rawRating);
  if (!placeTitle) return null;
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > MAX_DAY_NUMBER) return null;
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) return null;
  return {
    placeTitle,
    dayNumber,
    note: readText(form, "note", MAX_NOTE),
    rating,
    authorName: readText(form, "authorName", MAX_AUTHOR_NAME),
  };
}

/** One page of a trip's album: `?offset=` from the page before, `?author=` for one person's memories only. */
export async function GET(request: NextRequest, context: RouteContext<"/api/trips/[id]/memories">) {
  const limited = rateLimit(request, "trip-memories-read");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const params = request.nextUrl.searchParams;
  const offset = Number(params.get("offset") ?? 0);
  if (!Number.isInteger(offset) || offset < 0) return NextResponse.json({ error: "Invalid offset" }, { status: 400 });

  const page = await listTripMemories(viewer, id, offset, params.get("author"));
  if (!page) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(page);
}

/** Adds a memory, sent as a form: place, day, note, an optional rating and author, and an optional photo. */
export async function POST(request: NextRequest, context: RouteContext<"/api/trips/[id]/memories">) {
  const limited = rateLimit(request, "trip-memories-save");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (Number(request.headers.get("content-length")) > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "The photo is too large" }, { status: 413 });
  }
  const form = await request.formData().catch(() => null);
  const input = form ? readInput(form) : null;
  if (!form || !input) return NextResponse.json({ error: "The memory is missing required details" }, { status: 400 });

  let photo: MemoryPhoto | null = null;
  const file = form.get("photo");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_MEMORY_PHOTO_BYTES) return NextResponse.json({ error: "The photo is too large" }, { status: 413 });
    const content = await file.arrayBuffer();
    const kind = KINDS.find((candidate) => candidate.matches(new Uint8Array(content)));
    if (!kind) return NextResponse.json({ error: "The photo must be a PNG, JPEG, or WebP image" }, { status: 415 });
    photo = { content, extension: kind.extension, contentType: kind.type };
  }

  const { id } = await context.params;
  const memory = await addTripMemory(viewer, id, input, photo);
  if (!memory) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(memory, { status: 201 });
}
