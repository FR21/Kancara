import "server-only";
import { verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

/** The signed-in person as the database knows them: their row, and the workspace their data lives in. */
export type Viewer = {
  userId: string;
  workspaceId: string;
  email: string | null;
  /** Their uploaded profile photo when there is one, else the picture their sign-in provider gave. */
  picture: string | null;
};

type Identity = { uid: string; email?: string | null; name?: string | null; picture?: string | null };

const WORKSPACE_NAME = "Personal";
const PHOTO_PATH = "/api/profile/photo";

/** The address of an uploaded profile photo. The version changes with every upload, so browsers can cache it. */
export function photoUrl(updatedAt: Date): string {
  return `${PHOTO_PATH}?v=${updatedAt.getTime()}`;
}

/**
 * Finds the database row for a signed-in person, creating it and their workspace the first time they are seen.
 * Both are created in one transaction, so nobody ends up with an account but no workspace.
 */
export async function ensureAccount(identity: Identity): Promise<Viewer> {
  const found = await prisma.user.findFirst({
    where: { firebaseUid: identity.uid, deletedAt: null },
    select: {
      userId: true,
      email: true,
      avatarUpdatedAt: true,
      workspaces: { where: { deletedAt: null }, select: { workspaceId: true }, take: 1 },
    },
  });
  const email = identity.email ?? null;

  if (found && found.workspaces.length > 0 && found.email === email) {
    return {
      userId: found.userId,
      workspaceId: found.workspaces[0].workspaceId,
      email,
      picture: found.avatarUpdatedAt ? photoUrl(found.avatarUpdatedAt) : (identity.picture ?? null),
    };
  }

  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.upsert({
      where: { firebaseUid: identity.uid },
      update: { email },
      create: { firebaseUid: identity.uid, email, displayName: identity.name?.trim().slice(0, 50) || null },
      select: { userId: true, avatarUpdatedAt: true },
    });
    const workspace = await transaction.workspace.upsert({
      where: { userId: user.userId },
      update: {},
      create: { userId: user.userId, name: WORKSPACE_NAME },
      select: { workspaceId: true },
    });
    return {
      userId: user.userId,
      workspaceId: workspace.workspaceId,
      email,
      picture: user.avatarUpdatedAt ? photoUrl(user.avatarUpdatedAt) : (identity.picture ?? null),
    };
  });
}

/** The person making this request, or null when nobody is signed in. */
export async function currentViewer(): Promise<Viewer | null> {
  const session = await verifySession();
  if (!session) return null;
  return ensureAccount({
    uid: session.uid,
    email: session.email,
    name: typeof session.name === "string" ? session.name : null,
    picture: session.picture,
  });
}
