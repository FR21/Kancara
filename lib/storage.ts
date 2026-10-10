import "server-only";
import { createHash, createHmac } from "node:crypto";

// Private object storage for files people upload. The bucket is declared in neon.ts and speaks the S3 protocol;
// its endpoint and credentials arrive through the standard AWS_* variables. Requests are signed here (AWS
// Signature Version 4) so the app needs no SDK for three calls.
const BUCKET = "uploads";
const SERVICE = "s3";
const UNSIGNED = "UNSIGNED-PAYLOAD";
const TIMEOUT_MS = 15000;

type Method = "GET" | "PUT" | "DELETE";

function settings() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error("Object storage is not configured");
  return { endpoint: endpoint.replace(/\/+$/, ""), accessKeyId, secretAccessKey, region: process.env.AWS_REGION ?? "auto" };
}

const hmac = (key: Buffer | string, text: string) => createHmac("sha256", key).update(text).digest();
const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
// S3 wants every character escaped except letters, digits, and - _ . ~, with the slashes of a key left alone.
const escapePath = (path: string) =>
  path
    .split("/")
    .map((part) => encodeURIComponent(part).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`))
    .join("/");

async function send(method: Method, key: string, body?: ArrayBuffer, contentType?: string): Promise<Response> {
  const { endpoint, accessKeyId, secretAccessKey, region } = settings();
  const url = new URL(`${endpoint}/${BUCKET}/${escapePath(key)}`);
  const stamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = stamp.slice(0, 8);

  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-content-sha256": UNSIGNED,
    "x-amz-date": stamp,
  };
  if (contentType) headers["content-type"] = contentType;
  const names = Object.keys(headers).sort();
  const signedHeaders = names.join(";");
  const request = [
    method,
    url.pathname,
    "",
    ...names.map((name) => `${name}:${headers[name]}`),
    "",
    signedHeaders,
    UNSIGNED,
  ].join("\n");
  const scope = `${day}/${region}/${SERVICE}/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", stamp, scope, sha256(request)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, day), region), SERVICE), "aws4_request");
  const signature = hmac(signingKey, toSign).toString("hex");

  return fetch(url, {
    method,
    headers: {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export async function putObject(key: string, body: ArrayBuffer, contentType: string): Promise<void> {
  const response = await send("PUT", key, body, contentType);
  if (!response.ok) throw new Error(`Storing ${key} failed with ${response.status}`);
}

/** The stored object, or null when there is none under that key. */
export async function getObject(key: string): Promise<Response | null> {
  const response = await send("GET", key);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Reading ${key} failed with ${response.status}`);
  return response;
}

export async function deleteObject(key: string): Promise<void> {
  const response = await send("DELETE", key);
  if (!response.ok && response.status !== 404) throw new Error(`Deleting ${key} failed with ${response.status}`);
}
