import "server-only";
import { Prisma } from "@prisma/client";
import type { Viewer } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { deleteObject, putObject } from "@/lib/storage";

export type TripMemory = {
  id: string;
  tripId: string;
  userId: string;
  authorName: string;
  placeTitle: string;
  dayNumber: number;
  note: string;
  rating: number;
  photoKey?: string;
  photoUrl?: string;
  createdAt: string;
};

export type TripExpense = {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  paidBy: string;
  paidById?: string;
  sharedBy: string[];
  receiptKey?: string;
  receiptUrl?: string;
  createdAt: string;
};

export type TripSummaryData = {
  memories: TripMemory[];
  expenses: TripExpense[];
  settledMap: Record<string, boolean>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getDraftObject(planDraft: unknown): Record<string, unknown> {
  if (typeof planDraft === "object" && planDraft !== null && !Array.isArray(planDraft)) {
    return planDraft as Record<string, unknown>;
  }
  return {};
}

function parseMemories(raw: unknown): TripMemory[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): TripMemory[] => {
    if (typeof item !== "object" || item === null) return [];
    const rec = item as Record<string, unknown>;
    if (typeof rec.id !== "string" || typeof rec.placeTitle !== "string") return [];
    return [
      {
        id: rec.id,
        tripId: typeof rec.tripId === "string" ? rec.tripId : "",
        userId: typeof rec.userId === "string" ? rec.userId : "",
        authorName: typeof rec.authorName === "string" ? rec.authorName : "Member",
        placeTitle: rec.placeTitle,
        dayNumber: typeof rec.dayNumber === "number" ? rec.dayNumber : 1,
        note: typeof rec.note === "string" ? rec.note : "",
        rating: typeof rec.rating === "number" ? rec.rating : 5,
        photoKey: typeof rec.photoKey === "string" ? rec.photoKey : undefined,
        photoUrl: typeof rec.photoUrl === "string" ? rec.photoUrl : undefined,
        createdAt: typeof rec.createdAt === "string" ? rec.createdAt : new Date().toISOString(),
      },
    ];
  });
}

function parseExpenses(raw: unknown): TripExpense[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): TripExpense[] => {
    if (typeof item !== "object" || item === null) return [];
    const rec = item as Record<string, unknown>;
    if (typeof rec.id !== "string" || typeof rec.title !== "string" || typeof rec.amount !== "number") return [];
    return [
      {
        id: rec.id,
        tripId: typeof rec.tripId === "string" ? rec.tripId : "",
        title: rec.title,
        amount: rec.amount,
        paidBy: typeof rec.paidBy === "string" ? rec.paidBy : "Saya",
        paidById: typeof rec.paidById === "string" ? rec.paidById : undefined,
        sharedBy: Array.isArray(rec.sharedBy) ? rec.sharedBy.filter((s): s is string => typeof s === "string") : [],
        receiptKey: typeof rec.receiptKey === "string" ? rec.receiptKey : undefined,
        receiptUrl: typeof rec.receiptUrl === "string" ? rec.receiptUrl : undefined,
        createdAt: typeof rec.createdAt === "string" ? rec.createdAt : new Date().toISOString(),
      },
    ];
  });
}

function parseSettledMap(raw: unknown): Record<string, boolean> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const res: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === "boolean") res[key] = val;
  }
  return res;
}

/** Get all summary data (memories, expenses, settlements) for a trip */
export async function getTripSummaryData(viewer: Viewer, tripId: string): Promise<TripSummaryData | null> {
  if (!UUID.test(tripId)) return null;
  const trip = await prisma.trip.findFirst({
    where: { tripId, workspaceId: viewer.workspaceId, deletedAt: null },
    select: { planDraft: true },
  });
  if (!trip) return null;

  const draft = getDraftObject(trip.planDraft);
  return {
    memories: parseMemories(draft.memories),
    expenses: parseExpenses(draft.expenses),
    settledMap: parseSettledMap(draft.settledMap),
  };
}

/** Add a memory moment, optionally uploading photo to Neon S3 Object Storage */
export async function addTripMemory(
  viewer: Viewer,
  tripId: string,
  input: {
    placeTitle: string;
    dayNumber: number;
    note: string;
    rating: number;
    authorName?: string;
  },
  photo?: {
    buffer: ArrayBuffer;
    extension: string;
    mimeType: string;
  },
): Promise<TripMemory | null> {
  if (!UUID.test(tripId)) return null;

  const trip = await prisma.trip.findFirst({
    where: { tripId, workspaceId: viewer.workspaceId, deletedAt: null },
    select: { planDraft: true },
  });
  if (!trip) return null;

  const momentId = crypto.randomUUID();
  let photoKey: string | undefined = undefined;
  let photoUrl: string | undefined = undefined;

  // Upload to Google Cloud Storage if photo is attached
  // Folder structure: trips/{tripId}/memories/{userId}/{momentId}.{ext}
  if (photo) {
    photoKey = `trips/${tripId}/memories/${viewer.userId}/${momentId}.${photo.extension}`;
    photoUrl = await putObject(photoKey, photo.buffer, photo.mimeType);
  }

  // Resolve author name
  let authorName = input.authorName?.trim();
  if (!authorName) {
    const user = await prisma.user.findUnique({
      where: { userId: viewer.userId },
      select: { displayName: true },
    });
    authorName = user?.displayName || "Saya";
  }

  const newMemory: TripMemory = {
    id: momentId,
    tripId,
    userId: viewer.userId,
    authorName,
    placeTitle: input.placeTitle.trim().slice(0, 100),
    dayNumber: input.dayNumber || 1,
    note: input.note.trim().slice(0, 1000),
    rating: Math.max(1, Math.min(5, input.rating || 5)),
    photoKey,
    photoUrl,
    createdAt: new Date().toISOString(),
  };

  const draft = getDraftObject(trip.planDraft);
  const currentMemories = parseMemories(draft.memories);
  const updatedMemories = [newMemory, ...currentMemories];

  await prisma.trip.update({
    where: { tripId },
    data: {
      planDraft: {
        ...draft,
        memories: updatedMemories,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return newMemory;
}

/** Delete a memory and purge its photo from S3 if present */
export async function deleteTripMemory(viewer: Viewer, tripId: string, memoryId: string): Promise<boolean> {
  if (!UUID.test(tripId)) return false;

  const trip = await prisma.trip.findFirst({
    where: { tripId, workspaceId: viewer.workspaceId, deletedAt: null },
    select: { planDraft: true },
  });
  if (!trip) return false;

  const draft = getDraftObject(trip.planDraft);
  const currentMemories = parseMemories(draft.memories);
  const target = currentMemories.find((m) => m.id === memoryId);
  if (!target) return false;

  // Delete from S3 if it had a photo
  if (target.photoKey) {
    await deleteObject(target.photoKey).catch(() => undefined);
  }

  const updatedMemories = currentMemories.filter((m) => m.id !== memoryId);
  await prisma.trip.update({
    where: { tripId },
    data: {
      planDraft: {
        ...draft,
        memories: updatedMemories,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return true;
}

/** Add a trip shared expense with optional receipt in S3 */
export async function addTripExpense(
  viewer: Viewer,
  tripId: string,
  input: {
    title: string;
    amount: number;
    paidBy: string;
    sharedBy: string[];
  },
  receipt?: {
    buffer: ArrayBuffer;
    extension: string;
    mimeType: string;
  },
): Promise<TripExpense | null> {
  if (!UUID.test(tripId)) return null;

  const trip = await prisma.trip.findFirst({
    where: { tripId, workspaceId: viewer.workspaceId, deletedAt: null },
    select: { planDraft: true },
  });
  if (!trip) return null;

  const expenseId = crypto.randomUUID();
  let receiptKey: string | undefined = undefined;
  let receiptUrl: string | undefined = undefined;

  // Upload receipt to Google Cloud Storage: trips/{tripId}/receipts/{userId}/{expenseId}.{ext}
  if (receipt) {
    receiptKey = `trips/${tripId}/receipts/${viewer.userId}/${expenseId}.${receipt.extension}`;
    receiptUrl = await putObject(receiptKey, receipt.buffer, receipt.mimeType);
  }

  const newExpense: TripExpense = {
    id: expenseId,
    tripId,
    title: input.title.trim().slice(0, 100),
    amount: Math.round(input.amount),
    paidBy: input.paidBy.trim().slice(0, 50) || "Saya",
    paidById: viewer.userId,
    sharedBy: input.sharedBy.map((s) => s.trim().slice(0, 50)).filter(Boolean),
    receiptKey,
    receiptUrl,
    createdAt: new Date().toISOString(),
  };

  const draft = getDraftObject(trip.planDraft);
  const currentExpenses = parseExpenses(draft.expenses);
  const updatedExpenses = [...currentExpenses, newExpense];

  await prisma.trip.update({
    where: { tripId },
    data: {
      planDraft: {
        ...draft,
        expenses: updatedExpenses,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return newExpense;
}

/** Delete an expense and its receipt from S3 */
export async function deleteTripExpense(viewer: Viewer, tripId: string, expenseId: string): Promise<boolean> {
  if (!UUID.test(tripId)) return false;

  const trip = await prisma.trip.findFirst({
    where: { tripId, workspaceId: viewer.workspaceId, deletedAt: null },
    select: { planDraft: true },
  });
  if (!trip) return false;

  const draft = getDraftObject(trip.planDraft);
  const currentExpenses = parseExpenses(draft.expenses);
  const target = currentExpenses.find((e) => e.id === expenseId);
  if (!target) return false;

  if (target.receiptKey) {
    await deleteObject(target.receiptKey).catch(() => undefined);
  }

  const updatedExpenses = currentExpenses.filter((e) => e.id !== expenseId);
  await prisma.trip.update({
    where: { tripId },
    data: {
      planDraft: {
        ...draft,
        expenses: updatedExpenses,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return true;
}

/** Update settlement status */
export async function updateTripSettledMap(
  viewer: Viewer,
  tripId: string,
  settledMap: Record<string, boolean>,
): Promise<boolean> {
  if (!UUID.test(tripId)) return false;

  const trip = await prisma.trip.findFirst({
    where: { tripId, workspaceId: viewer.workspaceId, deletedAt: null },
    select: { planDraft: true },
  });
  if (!trip) return false;

  const draft = getDraftObject(trip.planDraft);
  await prisma.trip.update({
    where: { tripId },
    data: {
      planDraft: {
        ...draft,
        settledMap,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return true;
}
