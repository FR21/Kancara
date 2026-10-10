import "server-only";
import { Prisma } from "@prisma/client";
import { photoUrl, type Viewer } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { GENDERS, isAgeValid, isUsernameValid } from "@/lib/profile-fields";

/** What the profile page shows and edits. Empty strings stand for details the person has not given. */
export type Profile = {
  name: string;
  username: string;
  nationality: string;
  age: string;
  gender: string;
  photo: string | null;
};

export type ProfileDetails = Omit<Profile, "photo">;

const MAX_NAME_CHARS = 50;
const MAX_NATIONALITY_CHARS = 60;
const UNIQUE_VIOLATION = "P2002";

function asText(value: unknown, limit: number): string | null {
  return typeof value === "string" && value.trim().length <= limit ? value.trim() : null;
}

/** Reads profile details sent by the browser. Null when any of them is not something the form could produce. */
export function parseProfileDetails(body: unknown): ProfileDetails | null {
  if (typeof body !== "object" || body === null) return null;
  const input = body as Record<string, unknown>;
  const name = asText(input.name, MAX_NAME_CHARS);
  const nationality = asText(input.nationality, MAX_NATIONALITY_CHARS);
  // A leading @ is how people write a username, not part of it.
  const username = typeof input.username === "string" ? input.username.trim().replace(/^@/, "") : null;
  const age = typeof input.age === "string" || typeof input.age === "number" ? String(input.age).trim() : null;
  const gender = typeof input.gender === "string" ? input.gender : null;
  if (name === null || nationality === null || username === null || age === null || gender === null) return null;
  if (!isUsernameValid(username) || !isAgeValid(age)) return null;
  if (gender !== "" && !GENDERS.some((option) => option === gender)) return null;
  return { name, username, nationality, age, gender };
}

export async function getProfile(viewer: Viewer): Promise<Profile> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { userId: viewer.userId },
    select: { displayName: true, username: true, nationality: true, age: true, gender: true },
  });
  return {
    name: user.displayName ?? "",
    username: user.username ?? "",
    nationality: user.nationality ?? "",
    age: user.age === null ? "" : String(user.age),
    gender: user.gender ?? "",
    photo: viewer.picture,
  };
}

/** Saves the details. Returns false when the username already belongs to someone else. */
export async function saveProfile(viewer: Viewer, details: ProfileDetails): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { userId: viewer.userId },
      data: {
        displayName: details.name || null,
        username: details.username || null,
        nationality: details.nationality || null,
        age: details.age === "" ? null : Number(details.age),
        gender: details.gender || null,
      },
    });
    return true;
  } catch (caught) {
    if (caught instanceof Prisma.PrismaClientKnownRequestError && caught.code === UNIQUE_VIOLATION) return false;
    throw caught;
  }
}

/** Where the viewer's uploaded photo sits in storage, or null when they have none. */
export async function avatarKey(viewer: Viewer): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { userId: viewer.userId }, select: { avatarObjectKey: true } });
  return user?.avatarObjectKey ?? null;
}

/** Points the profile at a newly stored photo and returns its address. */
export async function setAvatar(viewer: Viewer, key: string): Promise<string> {
  const now = new Date();
  await prisma.user.update({
    where: { userId: viewer.userId },
    data: { avatarObjectKey: key, avatarUpdatedAt: now },
  });
  return photoUrl(now);
}
