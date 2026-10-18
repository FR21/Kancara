export { PUSH_WORKER, PUSH_SCOPE } from "./push-constants";
import { PUSH_WORKER, PUSH_SCOPE } from "./push-constants";

// Turning push notifications on for this device. The browser is asked for permission, a small service worker of
// its own is registered to receive them (it works on the dev server too, where the offline worker is not kept),
// Firebase hands over a token for the device, and the server is told the token.

/** Whether this device gets notifications: it cannot, the visitor refused, not yet, or yes. */
export type PushState = "unsupported" | "blocked" | "off" | "on";

const TOKEN_KEY = "kancara-push-token";
const REQUEST_TIMEOUT_MS = 15000;

const readKept = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

async function send(method: "GET" | "POST" | "DELETE", body?: unknown): Promise<Response> {
  const response = await fetch("/api/push", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Push request failed with ${response.status}`);
  return response;
}

/** The worker that receives notifications, once it is running: a subscription needs an active one. */
async function pushWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register(PUSH_WORKER, { scope: PUSH_SCOPE, updateViaCache: "none" });
  const starting = registration.installing ?? registration.waiting;
  if (!registration.active && starting) {
    await new Promise<void>((resolve) => {
      starting.addEventListener("statechange", () => {
        if (starting.state === "activated") resolve();
      });
    });
  }
  return registration;
}

/** Asks Firebase for this device's token and tells the server. Null when Firebase cannot give one here. */
async function register(locale: string): Promise<string | null> {
  const [{ getMessaging, getToken, isSupported }, { app }] = await Promise.all([
    import("firebase/messaging"),
    import("@/lib/firebase/client"),
  ]);
  if (!(await isSupported())) return null;
  const { key } = (await (await send("GET")).json()) as { key?: string };
  if (!key) return null;
  const token = await getToken(getMessaging(app), { vapidKey: key, serviceWorkerRegistration: await pushWorker() });
  if (!token) return null;
  await send("POST", { token, locale });
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Without storage the device is registered all the same; it just cannot be told apart later.
  }
  return token;
}

const supported = () => typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;

/**
 * Where this device stands, without asking for anything. A device that already agreed is registered again along
 * the way, quietly, so a token Firebase replaced keeps reaching the server.
 */
export async function syncPush(locale: string): Promise<PushState> {
  if (!supported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "off";
  try {
    return (await register(locale)) ? "on" : "unsupported";
  } catch {
    return readKept() ? "on" : "off";
  }
}

/** Asks the visitor for permission and turns notifications on. Must be called from a press, or browsers refuse. */
export async function enablePush(locale: string): Promise<PushState | "failed"> {
  if (!supported()) return "unsupported";
  const answer = await Notification.requestPermission();
  if (answer === "denied") return "blocked";
  if (answer !== "granted") return "off";
  try {
    return (await register(locale)) ? "on" : "unsupported";
  } catch {
    return "failed";
  }
}

/** Stops notifications to this device for the account signing out of it. Whatever fails, signing out goes on. */
export async function forgetPush(): Promise<void> {
  const token = readKept();
  if (!token) return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    await send("DELETE", { token });
  } catch {
    // The server drops a token by itself the first time a message to it bounces.
  }
}
