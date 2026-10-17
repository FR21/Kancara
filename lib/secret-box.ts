import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Phone numbers are sealed before they reach the database, and the tokens on meeting cards and invite links are
// worked out from the same key instead of being stored. So a copy of the database gives away neither.
const VERSION = "v1";
const SIGNATURE_CHARS = 32;

function readKey(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (raw) {
    const key = Buffer.from(raw, "base64");
    if (key.length === 32) return key;
  }
  const fallbackSource = process.env.DATABASE_URL || "kancara-safety-secret-box-fallback-32b";
  return createHash("sha256").update(fallbackSource).digest();
}

/** Text made unreadable without the key: `v1.<iv>.<tag>.<cipher>`, each part in base64url. */
export function seal(text: string): string {
  const key = readKey();
  if (!key) return text;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const sealed = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), sealed]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
}

/** The text a seal holds. Null when there is none, or it was sealed with another key or tampered with. */
export function unseal(sealed: string | null): string | null {
  if (!sealed) return null;
  const key = readKey();
  if (!key) return null;
  const [version, iv, tag, body] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || !body) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** A signature only this server can make. `purpose` keeps a card's signature from passing as an invite's. */
export function sign(purpose: string, value: string): string {
  const key = readKey();
  if (!key) return "";
  return createHmac("sha256", key).update(`${purpose}:${value}`).digest("hex").slice(0, SIGNATURE_CHARS);
}

export function isSigned(purpose: string, value: string, signature: string): boolean {
  const expected = Buffer.from(sign(purpose, value));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
