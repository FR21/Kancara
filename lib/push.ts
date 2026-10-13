import "server-only";
import { getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import type { Viewer } from "@/lib/account";
// Importing it sets up the admin app the messages are sent through.
import "@/lib/firebase/admin";
import { type Locale, isLocale } from "@/lib/locale";
import { prisma } from "@/lib/prisma";
import { seal, sign, unseal } from "@/lib/secret-box";

// Push notifications through Firebase Cloud Messaging. A device that turned them on hands over a token; a message
// to an account goes to every device it turned them on with. The token is kept sealed, beside a keyed hash that
// tells whether a device is already known.

export type PushMessage = {
  title: string;
  body: string;
  /** The page a tap on the notification opens. */
  url: string;
  /** Notifications with the same tag replace each other, so one search is one notification. */
  tag: string;
};

const MAX_TOKEN_CHARS = 4096;
// A notification about someone being looked for is no use an hour later.
const TTL_SECONDS = "900";
const DEAD_TOKEN = ["messaging/registration-token-not-registered", "messaging/invalid-registration-token", "messaging/invalid-argument"];

const hashOf = (token: string) => sign("push-token", token);

/** The key a browser needs to ask Firebase for a token. It is public by design; empty when pushing is not set up. */
export function pushKey(): string {
  return process.env.FIREBASE_CLOUD_MESSAGING ?? "";
}

export function isPushToken(value: unknown): value is string {
  return typeof value === "string" && value.length > 20 && value.length <= MAX_TOKEN_CHARS;
}

/** Remembers a device for the viewer. A device that belonged to another account before now belongs to this one. */
export async function savePushToken(viewer: Viewer, token: string, locale: string): Promise<void> {
  const data = {
    workspaceId: viewer.workspaceId,
    userId: viewer.userId,
    tokenCipher: seal(token),
    locale: isLocale(locale) ? locale : "id",
    deletedAt: null,
  };
  await prisma.pushSubscription.upsert({ where: { tokenHash: hashOf(token) }, create: { ...data, tokenHash: hashOf(token) }, update: data });
}

/** Forgets a device, for example when its owner signs out of it. */
export async function removePushToken(viewer: Viewer, token: string): Promise<void> {
  await prisma.pushSubscription.updateMany({
    where: { tokenHash: hashOf(token), userId: viewer.userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}

/**
 * Sends each of these accounts a notification on every device it turned them on with, worded for that device's
 * language and for that account. A device Firebase no longer knows is forgotten. It never throws: a notification
 * that cannot be sent must not fail the action it tells about.
 */
export async function sendPush(userIds: string[], build: (locale: Locale, userId: string) => PushMessage): Promise<void> {
  try {
    if (userIds.length === 0 || getApps().length === 0) return;
    const devices = await prisma.pushSubscription.findMany({
      where: { userId: { in: userIds }, deletedAt: null },
      select: { pushSubscriptionId: true, userId: true, tokenCipher: true, locale: true },
    });
    const reachable = devices.flatMap((device) => {
      const token = unseal(device.tokenCipher);
      return token ? [{ ...device, token }] : [];
    });
    if (reachable.length === 0) return;

    const reply = await getMessaging().sendEach(
      reachable.map((device) => ({
        token: device.token,
        // Data only: the service worker draws the notification itself, the same way on every browser.
        data: { ...build(isLocale(device.locale) ? device.locale : "id", device.userId) },
        webpush: { headers: { Urgency: "high", TTL: TTL_SECONDS } },
      })),
    );
    const gone = reachable.filter((_, index) => DEAD_TOKEN.includes(reply.responses[index]?.error?.code ?? ""));
    if (gone.length > 0) {
      await prisma.pushSubscription.updateMany({
        where: { pushSubscriptionId: { in: gone.map((device) => device.pushSubscriptionId) } },
        data: { deletedAt: new Date() },
      });
    }
  } catch (error) {
    console.error("Push notification failed", error);
  }
}
