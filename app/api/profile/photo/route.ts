import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { avatarKey, setAvatar } from "@/lib/profile";
import { MAX_PHOTO_BYTES } from "@/lib/profile-fields";
import { rateLimit } from "@/lib/rate-limit";
import { deleteObject, getObject, putObject } from "@/lib/storage";

// A multipart request carries a little more than the file itself.
const MAX_REQUEST_BYTES = MAX_PHOTO_BYTES + 64 * 1024;
const ONE_YEAR_S = 60 * 60 * 24 * 365;

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

/** The viewer's uploaded profile photo. It is private, so it is served here and not from the bucket. */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "profile-photo-read");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = await avatarKey(viewer);
  const stored = key ? await getObject(key) : null;
  if (!stored) return NextResponse.json({ error: "No photo" }, { status: 404 });

  return new NextResponse(stored.body, {
    headers: {
      "Content-Type": stored.headers.get("content-type") ?? "application/octet-stream",
      // The address carries a version that changes with every upload, so this copy never goes stale.
      "Cache-Control": `private, max-age=${ONE_YEAR_S}, immutable`,
    },
  });
}

/** Stores a new profile photo, points the profile at it, then removes the one it replaces. */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "profile-photo-save");
  if (limited) return limited;

  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (Number(request.headers.get("content-length")) > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "The photo is too large" }, { status: 413 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) return NextResponse.json({ error: "No photo was sent" }, { status: 400 });
  if (file.size === 0 || file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "The photo is too large" }, { status: 413 });
  }

  const content = await file.arrayBuffer();
  const kind = KINDS.find((candidate) => candidate.matches(new Uint8Array(content)));
  if (!kind) return NextResponse.json({ error: "The photo must be a PNG, JPEG, or WebP image" }, { status: 415 });

  const previous = await avatarKey(viewer);
  const key = `avatars/${viewer.userId}/${crypto.randomUUID()}.${kind.extension}`;
  await putObject(key, content, kind.type);
  try {
    const photo = await setAvatar(viewer, key);
    // The old file is no longer referenced. Failing to remove it leaves an orphan, not a broken profile.
    if (previous) await deleteObject(previous).catch(() => undefined);
    return NextResponse.json({ photo }, { status: 201 });
  } catch (caught) {
    await deleteObject(key).catch(() => undefined);
    throw caught;
  }
}
