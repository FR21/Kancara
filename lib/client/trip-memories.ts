import { withTimeout } from "@/lib/client/abort";

/** One moment the group kept from a trip. `removable` says whether the viewer may take it out of the album. */
export type TripMemory = {
  id: string;
  /** Empty when the person who recorded it has no name on their account. */
  authorName: string;
  placeTitle: string;
  dayNumber: number;
  note: string;
  rating: number | null;
  photoUrl: string | null;
  createdAt: string;
  removable: boolean;
};
export type MemoryAuthor = { name: string; count: number };
export type MemoryPage = { memories: TripMemory[]; authors: MemoryAuthor[]; total: number; nextOffset: number | null };
export type NewMemory = {
  placeTitle: string;
  dayNumber: number;
  note: string;
  rating: number | null;
  authorName: string;
  photo: File | null;
};

export class TripMemoriesError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
  }
}

/** The largest photo the server takes. Checked here too, so a big file is turned down before it is sent. */
export const MAX_MEMORY_PHOTO_BYTES = 10 * 1024 * 1024;
export const MEMORY_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const REQUEST_TIMEOUT_MS = 15000;
// A photo on a slow connection takes far longer to send than a list takes to read.
const UPLOAD_TIMEOUT_MS = 60000;
const RATE_LIMIT_WAIT_MS = 1100;

function basePath(tripId: string): string {
  return `/api/trips/${encodeURIComponent(tripId)}/memories`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseMemory(value: unknown): TripMemory[] {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.placeTitle !== "string") return [];
  return [
    {
      id: value.id,
      authorName: typeof value.authorName === "string" ? value.authorName : "",
      placeTitle: value.placeTitle,
      dayNumber: asCount(value.dayNumber) ?? 1,
      note: typeof value.note === "string" ? value.note : "",
      rating: asCount(value.rating),
      photoUrl: typeof value.photoUrl === "string" ? value.photoUrl : null,
      createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
      removable: value.removable === true,
    },
  ];
}

function parseAuthor(value: unknown): MemoryAuthor[] {
  if (!isRecord(value) || typeof value.name !== "string") return [];
  return [{ name: value.name, count: asCount(value.count) ?? 0 }];
}

function parsePage(value: unknown): MemoryPage {
  if (!isRecord(value)) throw new TripMemoriesError("Invalid memories response");
  return {
    memories: Array.isArray(value.memories) ? value.memories.flatMap(parseMemory) : [],
    authors: Array.isArray(value.authors) ? value.authors.flatMap(parseAuthor) : [],
    total: asCount(value.total) ?? 0,
    nextOffset: asCount(value.nextOffset),
  };
}

async function send(
  path: string,
  init: RequestInit,
  timeout: number,
  signal?: AbortSignal,
  retried = false,
): Promise<Response> {
  const response = await fetch(path, { ...init, signal: withTimeout(signal, timeout) });
  // Every API allows three requests a second; one busy moment is waited out, not shown as a failure.
  if (response.status === 429 && !retried) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
    return send(path, init, timeout, signal, true);
  }
  if (!response.ok) throw new TripMemoriesError(`Memories request failed with ${response.status}`, response.status);
  return response;
}

export const tripMemories = {
  /** One page of the album. `offset` is the `nextOffset` of the page before; `author` keeps one person's only. */
  async list(tripId: string, offset: number, author: string | null, signal: AbortSignal): Promise<MemoryPage> {
    const params = new URLSearchParams({ offset: String(offset) });
    if (author !== null) params.set("author", author);
    const response = await send(`${basePath(tripId)}?${params}`, { method: "GET" }, REQUEST_TIMEOUT_MS, signal);
    return parsePage(await response.json());
  },

  async add(tripId: string, memory: NewMemory): Promise<TripMemory> {
    const form = new FormData();
    form.set("placeTitle", memory.placeTitle);
    form.set("dayNumber", String(memory.dayNumber));
    form.set("note", memory.note);
    if (memory.rating !== null) form.set("rating", String(memory.rating));
    form.set("authorName", memory.authorName);
    if (memory.photo) form.set("photo", memory.photo);
    const response = await send(basePath(tripId), { method: "POST", body: form }, UPLOAD_TIMEOUT_MS);
    const [created] = parseMemory(await response.json());
    if (!created) throw new TripMemoriesError("Invalid memory response");
    return created;
  },

  async remove(tripId: string, memoryId: string): Promise<void> {
    await send(`${basePath(tripId)}/${encodeURIComponent(memoryId)}`, { method: "DELETE" }, REQUEST_TIMEOUT_MS);
  },
};
