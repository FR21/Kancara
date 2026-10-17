import "server-only";
import type { Viewer } from "@/lib/account";
import { type MemoryAuthor, type MemoryPage, type TripMemory, MAX_MEMORY_PHOTO_BYTES } from "@/lib/client/trip-memories";
import { deleteObject, putObject } from "@/lib/object-storage";
import { prisma } from "@/lib/prisma";

export type MemoryInput = {
  placeTitle: string;
  dayNumber: number;
  note: string;
  rating: number | null;
  /** The member the memory is from, when someone records it for them. Empty means the viewer. */
  authorName: string;
};
export type MemoryPhoto = { content: ArrayBuffer; extension: string; contentType: string };
export type RemoveResult = "removed" | "notFound" | "refused";

export const MAX_PLACE_TITLE = 100;
export const MAX_NOTE = 1000;
export const MAX_AUTHOR_NAME = 50;
export const MAX_DAY_NUMBER = 366;
const PAGE_SIZE = 24;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const KINDS = [
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

export function readText(form: FormData, name: string, limit: number): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export function readInput(form: FormData): MemoryInput | null {
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

export async function readPhoto(form: FormData): Promise<{ photo: MemoryPhoto | null; error?: { message: string; status: number } }> {
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { photo: null };
  if (file.size > MAX_MEMORY_PHOTO_BYTES) return { photo: null, error: { message: "The photo is too large", status: 413 } };
  const content = await file.arrayBuffer();
  const kind = KINDS.find((candidate) => candidate.matches(new Uint8Array(content)));
  if (!kind) return { photo: null, error: { message: "The photo must be a PNG, JPEG, or WebP image", status: 415 } };
  return { photo: { content, extension: kind.extension, contentType: kind.type } };
}

type TripAccess = { tripId: string; workspaceId: string; organizer: boolean };
type MemoryRecord = {
  tripMemoryId: string;
  userId: string;
  authorName: string;
  placeTitle: string;
  dayNumber: number;
  note: string;
  rating: number | null;
  photoObjectKey: string | null;
  createdAt: Date;
};

// Everyone in the group shares one album: the organizer, whose workspace holds the trip, and every member who
// joined it with their own account. Memories live in the trip's workspace, whoever wrote them.
async function findTrip(viewer: Viewer, tripId: string): Promise<TripAccess | null> {
  if (!UUID.test(tripId)) return null;
  const trip = await prisma.trip.findFirst({
    where: {
      tripId,
      deletedAt: null,
      OR: [{ workspaceId: viewer.workspaceId }, { members: { some: { userId: viewer.userId, deletedAt: null } } }],
    },
    select: { tripId: true, workspaceId: true },
  });
  if (!trip) return null;
  return { ...trip, organizer: trip.workspaceId === viewer.workspaceId };
}

/** The photo is private, so it is served through the API, which checks the viewer may see it. */
function photoPath(tripId: string, memoryId: string): string {
  return `/api/trips/${tripId}/memories/${memoryId}/photo`;
}

function toMemory(record: MemoryRecord, tripId: string, viewer: Viewer, trip: TripAccess): TripMemory {
  return {
    id: record.tripMemoryId,
    authorName: record.authorName,
    placeTitle: record.placeTitle,
    dayNumber: record.dayNumber,
    note: record.note,
    rating: record.rating,
    photoUrl: record.photoObjectKey ? photoPath(tripId, record.tripMemoryId) : null,
    createdAt: record.createdAt.toISOString(),
    removable: trip.organizer || record.userId === viewer.userId,
  };
}

const MEMORY_FIELDS = {
  tripMemoryId: true,
  userId: true,
  authorName: true,
  placeTitle: true,
  dayNumber: true,
  note: true,
  rating: true,
  photoObjectKey: true,
  createdAt: true,
} as const;

/**
 * One page of a trip's memories, newest first, optionally from one author only, with every author and how many
 * memories each has. Null when the viewer cannot see the trip.
 */
export async function listTripMemories(
  viewer: Viewer,
  tripId: string,
  offset: number,
  author: string | null,
): Promise<MemoryPage | null> {
  const trip = await findTrip(viewer, tripId);
  if (!trip) return null;

  const scope = { tripId: trip.tripId, workspaceId: trip.workspaceId, deletedAt: null };
  const [records, groups] = await Promise.all([
    prisma.tripMemory.findMany({
      where: author === null ? scope : { ...scope, authorName: author },
      orderBy: [{ createdAt: "desc" }, { tripMemoryId: "asc" }],
      skip: offset,
      take: PAGE_SIZE + 1,
      select: MEMORY_FIELDS,
    }),
    prisma.tripMemory.groupBy({ by: ["authorName"], where: scope, _count: { _all: true } }),
  ]);

  const authors: MemoryAuthor[] = groups
    .map((group) => ({ name: group.authorName, count: group._count._all }))
    .sort((first, second) => first.name.localeCompare(second.name));
  return {
    memories: records.slice(0, PAGE_SIZE).map((record) => toMemory(record, trip.tripId, viewer, trip)),
    authors,
    total: authors.reduce((sum, entry) => sum + entry.count, 0),
    // One more row than the page is asked for; when it comes back there is a next page.
    nextOffset: records.length > PAGE_SIZE ? offset + PAGE_SIZE : null,
  };
}

/**
 * Records a memory for a trip the viewer belongs to. The photo goes to object storage first, under the memory's
 * own id, and is removed again when the row cannot be written, so no file is left that nothing points at.
 */
export async function addTripMemory(
  viewer: Viewer,
  tripId: string,
  input: MemoryInput,
  photo: MemoryPhoto | null,
): Promise<TripMemory | null> {
  const trip = await findTrip(viewer, tripId);
  if (!trip) return null;

  const memoryId = crypto.randomUUID();
  const photoObjectKey = photo ? `trips/${trip.tripId}/memories/${viewer.userId}/${memoryId}.${photo.extension}` : null;
  if (photo && photoObjectKey) await putObject(photoObjectKey, photo.content, photo.contentType, false);

  let authorName = input.authorName;
  if (!authorName) {
    const user = await prisma.user.findUnique({ where: { userId: viewer.userId }, select: { displayName: true } });
    authorName = user?.displayName?.trim().slice(0, MAX_AUTHOR_NAME) ?? "";
  }

  try {
    const record = await prisma.tripMemory.create({
      data: {
        tripMemoryId: memoryId,
        workspaceId: trip.workspaceId,
        tripId: trip.tripId,
        userId: viewer.userId,
        authorName,
        placeTitle: input.placeTitle,
        dayNumber: input.dayNumber,
        note: input.note,
        rating: input.rating,
        photoObjectKey,
      },
      select: MEMORY_FIELDS,
    });
    return toMemory(record, trip.tripId, viewer, trip);
  } catch (caught) {
    if (photoObjectKey) await deleteObject(photoObjectKey).catch(() => undefined);
    throw caught;
  }
}

/**
 * Updates a memory in the album. Only its original author or the trip organizer can update it.
 */
export async function updateTripMemory(
  viewer: Viewer,
  tripId: string,
  memoryId: string,
  input: MemoryInput,
  photo: MemoryPhoto | null,
  removePhoto = false,
): Promise<TripMemory | null | "refused"> {
  if (!UUID.test(memoryId)) return null;
  const trip = await findTrip(viewer, tripId);
  if (!trip) return null;

  const where = { tripMemoryId: memoryId, tripId: trip.tripId, workspaceId: trip.workspaceId, deletedAt: null };
  const memory = await prisma.tripMemory.findFirst({ where, select: { userId: true, photoObjectKey: true } });
  if (!memory) return null;
  if (!trip.organizer && memory.userId !== viewer.userId) return "refused";

  let photoObjectKey: string | null | undefined = undefined;
  if (photo) {
    const photoId = crypto.randomUUID();
    photoObjectKey = `trips/${trip.tripId}/memories/${viewer.userId}/${photoId}.${photo.extension}`;
    await putObject(photoObjectKey, photo.content, photo.contentType, false);
  } else if (removePhoto) {
    photoObjectKey = null;
  }

  let authorName = input.authorName;
  if (!authorName) {
    const user = await prisma.user.findUnique({ where: { userId: viewer.userId }, select: { displayName: true } });
    authorName = user?.displayName?.trim().slice(0, MAX_AUTHOR_NAME) ?? "";
  }

  try {
    const record = await prisma.tripMemory.update({
      where: { tripMemoryId: memoryId },
      data: {
        placeTitle: input.placeTitle,
        dayNumber: input.dayNumber,
        note: input.note,
        rating: input.rating,
        authorName,
        ...(photoObjectKey !== undefined ? { photoObjectKey } : {}),
      },
      select: MEMORY_FIELDS,
    });
    return toMemory(record, trip.tripId, viewer, trip);
  } catch (caught) {
    if (photoObjectKey) await deleteObject(photoObjectKey).catch(() => undefined);
    throw caught;
  }
}

/**
 * Hides a memory from the album. Whoever recorded it may, and so may the organizer. The photo stays in storage
 * with the row, as soft deletion keeps everything; the API stops serving it at once.
 */
export async function removeTripMemory(viewer: Viewer, tripId: string, memoryId: string): Promise<RemoveResult> {
  if (!UUID.test(memoryId)) return "notFound";
  const trip = await findTrip(viewer, tripId);
  if (!trip) return "notFound";

  const where = { tripMemoryId: memoryId, tripId: trip.tripId, workspaceId: trip.workspaceId, deletedAt: null };
  const memory = await prisma.tripMemory.findFirst({ where, select: { userId: true } });
  if (!memory) return "notFound";
  if (!trip.organizer && memory.userId !== viewer.userId) return "refused";

  const { count } = await prisma.tripMemory.updateMany({ where, data: { deletedAt: new Date() } });
  return count === 0 ? "notFound" : "removed";
}

/** Where a memory's photo is kept, when the viewer may see it and it has one. */
export async function memoryPhotoKey(viewer: Viewer, tripId: string, memoryId: string): Promise<string | null> {
  if (!UUID.test(memoryId)) return null;
  const trip = await findTrip(viewer, tripId);
  if (!trip) return null;

  const memory = await prisma.tripMemory.findFirst({
    where: { tripMemoryId: memoryId, tripId: trip.tripId, workspaceId: trip.workspaceId, deletedAt: null },
    select: { photoObjectKey: true },
  });
  return memory?.photoObjectKey ?? null;
}
