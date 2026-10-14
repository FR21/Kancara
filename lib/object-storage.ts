import "server-only";
import { adminStorage } from "@/lib/firebase/admin";

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "kancara-app-uploads";
const STORAGE_BASE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || `https://storage.googleapis.com/${BUCKET_NAME}`;

function getBucket() {
  if (!adminStorage) {
    throw new Error("Google Cloud Storage / Firebase Admin is not initialized");
  }
  return adminStorage.bucket(BUCKET_NAME);
}

/** Get the public Google Cloud Storage CDN URL for an object key */
export function getPublicUrl(key: string): string {
  return `${STORAGE_BASE_URL.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
}

/** Store a file in Google Cloud Storage and make it publicly accessible via Google CDN */
export async function putObject(
  key: string,
  body: ArrayBuffer,
  contentType: string,
  makePublic: boolean = true,
): Promise<string> {
  const bucket = getBucket();
  const file = bucket.file(key);

  const buffer = Buffer.from(body);
  await file.save(buffer, {
    contentType,
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
    },
    resumable: false,
  });

  if (makePublic) {
    await file.makePublic().catch((err) => {
      console.warn("Could not make GCS file public, falling back to proxy stream:", err?.message);
    });
  }

  return getPublicUrl(key);
}

/** Retrieve an object from Google Cloud Storage, or null when not found */
export async function getObject(key: string): Promise<Response | null> {
  const bucket = getBucket();
  const file = bucket.file(key);

  const [exists] = await file.exists().catch(() => [false]);
  if (!exists) return null;

  try {
    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata().catch(() => [{}]);
    const contentType = (metadata as Record<string, unknown>)?.contentType as string || "application/octet-stream";

    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error(`Failed to read GCS object ${key}:`, error);
    return null;
  }
}

/** Delete an object from Google Cloud Storage */
export async function deleteObject(key: string): Promise<void> {
  const bucket = getBucket();
  const file = bucket.file(key);
  await file.delete({ ignoreNotFound: true }).catch(() => undefined);
}
