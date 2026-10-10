import "server-only";
import type { Viewer } from "@/lib/account";
import { prisma } from "@/lib/prisma";

/** The countries the viewer has marked on their travel map. */
export async function listVisited(viewer: Viewer): Promise<string[]> {
  const rows = await prisma.visitedCountry.findMany({
    where: { workspaceId: viewer.workspaceId, userId: viewer.userId, deletedAt: null },
    select: { countryCode: true },
    orderBy: { countryCode: "asc" },
  });
  return rows.map((row) => row.countryCode);
}

/**
 * Makes the marked countries exactly `codes`. Countries no longer in the list are soft-deleted, ones marked again
 * are restored, and new ones are added. The three steps run in one transaction, so the map is never half saved.
 */
export async function replaceVisited(viewer: Viewer, codes: string[]): Promise<void> {
  const mine = { workspaceId: viewer.workspaceId, userId: viewer.userId };
  await prisma.$transaction([
    prisma.visitedCountry.updateMany({
      where: { ...mine, deletedAt: null, countryCode: { notIn: codes } },
      data: { deletedAt: new Date() },
    }),
    prisma.visitedCountry.updateMany({
      where: { ...mine, deletedAt: { not: null }, countryCode: { in: codes } },
      data: { deletedAt: null },
    }),
    prisma.visitedCountry.createMany({
      data: codes.map((countryCode) => ({ ...mine, countryCode })),
      skipDuplicates: true,
    }),
  ]);
}
