import { withTimeout } from "@/lib/client/abort";
import type { Locale } from "@/lib/locale";

// Reading a photo of a menu or a food label against the group's food restrictions. The photo is made small on the
// phone before it is sent: a phone camera's 12-megapixel photo is several megabytes, and a 1600-pixel copy reads
// just as well.

export const SUITABILITIES = ["safe", "warning", "danger"] as const;
export type Suitability = (typeof SUITABILITIES)[number];

/** How one member with restrictions fares with the dish. Names stay on the phone; only the member's id is sent. */
export type MemberDietCheck = { memberId: string; status: Suitability; reason: string };

/** A question to ask the staff, in the destination's language. */
export type WaiterQuestion = {
  language: string;
  /** BCP-47 tag of `language`, used to pick the voice that reads it aloud. */
  languageTag: string;
  nativePhrase: string;
  romanized: string;
  /** What the question says, in the reader's language. */
  translation: string;
};

export type DietaryAnalysis = {
  dishName: string;
  originalLanguage: string;
  ingredients: string[];
  doubtfulIngredients: string[];
  suitability: Suitability;
  summary: string;
  memberChecks: MemberDietCheck[];
  waiterQuestion: WaiterQuestion | null;
};

/** Why a scan failed: the file is not a picture, the picture is too large or cannot be opened, no connection, or anything else. */
export type ScanFailure = "notImage" | "tooLarge" | "unreadable" | "offline" | "failed";

export class DietaryScanError extends Error {
  constructor(readonly reason: ScanFailure) {
    super(`Menu scan failed: ${reason}`);
  }
}

/** The largest photo the server takes, in bytes. */
export const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
/** Photo types the server takes. iPhones hand over a JPEG copy of their HEIC photos when a page asks for images. */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
const MAX_SIDE_PX = 1600;
const JPEG_QUALITY = 0.85;
const SCAN_TIMEOUT_MS = 50_000;
const MAX_TEXT = 600;
const MAX_ITEMS = 30;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_TEXT) : "";
}

function readList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(readText).filter(Boolean).slice(0, MAX_ITEMS) : [];
}

function readSuitability(value: unknown): Suitability | null {
  return SUITABILITIES.find((entry) => entry === value) ?? null;
}

function parseWaiterQuestion(value: unknown): WaiterQuestion | null {
  if (!isRecord(value)) return null;
  const question = {
    language: readText(value.language),
    languageTag: readText(value.languageTag),
    nativePhrase: readText(value.nativePhrase),
    romanized: readText(value.romanized),
    translation: readText(value.translation),
  };
  return question.nativePhrase ? question : null;
}

/** A reading of a menu, from the model or the network, or null when it is not one. */
export function parseDietaryAnalysis(value: unknown): DietaryAnalysis | null {
  if (!isRecord(value)) return null;
  const suitability = readSuitability(value.suitability);
  const dishName = readText(value.dishName);
  if (!suitability || !dishName) return null;
  const memberChecks = Array.isArray(value.memberChecks)
    ? value.memberChecks.flatMap((check) => {
        if (!isRecord(check)) return [];
        const status = readSuitability(check.status);
        const memberId = readText(check.memberId);
        return status && memberId ? [{ memberId, status, reason: readText(check.reason) }] : [];
      })
    : [];
  return {
    dishName,
    originalLanguage: readText(value.originalLanguage),
    ingredients: readList(value.ingredients),
    doubtfulIngredients: readList(value.doubtfulIngredients),
    suitability,
    summary: readText(value.summary),
    memberChecks,
    waiterQuestion: parseWaiterQuestion(value.waiterQuestion),
  };
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  return new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new DietaryScanError("unreadable"));
    image.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

/**
 * A copy of the photo at most 1600 pixels on its longer side, as JPEG, turned the way the camera held it (browsers
 * apply the photo's orientation when drawing it). A photo the browser cannot open (HEIC outside Safari) is sent
 * as it is when the server takes its type and size.
 */
export async function prepareMenuPhoto(file: File): Promise<Blob> {
  if (file.type && !file.type.startsWith("image/")) throw new DietaryScanError("notImage");
  const sendAsIs = () => {
    const accepted = PHOTO_TYPES.some((type) => type === file.type);
    if (!accepted) throw new DietaryScanError("unreadable");
    if (file.size > MAX_PHOTO_BYTES) throw new DietaryScanError("tooLarge");
    return file;
  };

  let image: HTMLImageElement;
  try {
    image = await loadImage(file);
  } catch {
    return sendAsIs();
  }
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return sendAsIs();
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob) return sendAsIs();
  if (blob.size > MAX_PHOTO_BYTES) throw new DietaryScanError("tooLarge");
  return blob;
}

function failureOf(status: number): ScanFailure {
  if (status === 413) return "tooLarge";
  if (status === 415) return "notImage";
  return "failed";
}

/** Reads the photo against the restrictions of the trip's members. */
export async function scanMenu(tripId: string, photo: Blob, locale: Locale, signal: AbortSignal): Promise<DietaryAnalysis> {
  const form = new FormData();
  form.append("tripId", tripId);
  form.append("locale", locale);
  form.append("image", photo, photo.type === "image/jpeg" ? "menu.jpg" : "menu");

  let response: Response;
  try {
    response = await fetch("/api/dietary-scan", { method: "POST", body: form, signal: withTimeout(signal, SCAN_TIMEOUT_MS) });
  } catch (caught) {
    if (signal.aborted) throw caught;
    throw new DietaryScanError(navigator.onLine ? "failed" : "offline");
  }
  if (!response.ok) throw new DietaryScanError(failureOf(response.status));
  const analysis = parseDietaryAnalysis(await response.json());
  if (!analysis) throw new DietaryScanError("failed");
  return analysis;
}
