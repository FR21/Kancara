import { type NextRequest, NextResponse } from "next/server";
import { currentViewer } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import type { SavedMemberProfile } from "@/lib/saved-members-store";

const CACHE_KEY_PREFIX = "saved_member_profiles_v1";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function getCacheKey(workspaceId?: string | null): string {
  return workspaceId ? `${CACHE_KEY_PREFIX}_${workspaceId}` : `${CACHE_KEY_PREFIX}_default`;
}

export async function GET(request: NextRequest) {
  try {
    const viewer = await currentViewer().catch(() => null);
    const workspaceId = viewer?.workspaceId ?? null;
    const cacheKey = getCacheKey(workspaceId);

    // 1. Check if dedicated profiles are saved in database (apiCache table)
    const cachedRecord = await prisma.apiCache.findUnique({
      where: { cacheKey },
    });

    let dbProfiles: SavedMemberProfile[] = [];
    if (cachedRecord && Array.isArray(cachedRecord.payload) && cachedRecord.payload.length > 0) {
      dbProfiles = cachedRecord.payload as unknown as SavedMemberProfile[];
    }

    // 2. Also extract any members from existing trips in the database
    const tripWhere = workspaceId
      ? { workspaceId, deletedAt: null }
      : { deletedAt: null };

    const trips = await prisma.trip.findMany({
      where: tripWhere,
      take: 20,
      orderBy: { updatedAt: "desc" },
      select: {
        tripId: true,
        name: true,
        planDraft: true,
      },
    });

    const membersFromTrips: SavedMemberProfile[] = [];
    for (const trip of trips) {
      const draft = trip.planDraft as any;
      if (draft && Array.isArray(draft.members)) {
        for (const m of draft.members) {
          if (m && m.name && m.name.trim()) {
            const alreadyInList =
              dbProfiles.some((p) => p.name.toLowerCase() === m.name.toLowerCase()) ||
              membersFromTrips.some((p) => p.name.toLowerCase() === m.name.toLowerCase());

            if (!alreadyInList) {
              membersFromTrips.push({
                id: m.id || crypto.randomUUID(),
                name: m.name,
                relationship: "Keluarga",
                ageGroup: m.ageGroup || "adult",
                age: m.age ?? null,
                needs: Array.isArray(m.needs) ? m.needs : [],
                customNeeds: Array.isArray(m.customNeeds) ? m.customNeeds : [],
                allergies: m.allergies || "",
                interests: m.interests || {},
                customInterests: Array.isArray(m.customInterests) ? m.customInterests : [],
                notes: `Anggota dari perjalanan: ${trip.name}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
      }
    }

    // Merge & deduplicate strictly by both id and normalized name
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const deduplicatedProfiles: SavedMemberProfile[] = [];

    for (const p of [...dbProfiles, ...membersFromTrips]) {
      const normName = (p.name || "").trim().toLowerCase();
      if (!normName) continue;
      if (!seenIds.has(p.id) && !seenNames.has(normName)) {
        seenIds.add(p.id);
        seenNames.add(normName);
        deduplicatedProfiles.push(p);
      }
    }

    const resultProfiles = deduplicatedProfiles;

    return NextResponse.json({
      status: "ok",
      profiles: resultProfiles,
      fromDatabase: true,
      tripCount: trips.length,
    });
  } catch (error) {
    console.error("Failed to load saved profiles from database:", error);
    // Fallback gracefully
    return NextResponse.json({
      status: "ok",
      profiles: [],
      fromDatabase: false,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const viewer = await currentViewer().catch(() => null);
    const workspaceId = viewer?.workspaceId ?? null;
    const cacheKey = getCacheKey(workspaceId);

    const body = (await request.json()) as SavedMemberProfile;
    if (!body || !body.name) {
      return NextResponse.json({ error: "Profile name is required" }, { status: 400 });
    }

    // Fetch existing records from database
    const cachedRecord = await prisma.apiCache.findUnique({
      where: { cacheKey },
    });

    let currentList: SavedMemberProfile[] = [];
    if (cachedRecord && Array.isArray(cachedRecord.payload)) {
      currentList = cachedRecord.payload as unknown as SavedMemberProfile[];
    } else {
      currentList = [];
    }

    // Update or insert
    const now = new Date().toISOString();
    const existingIndex = currentList.findIndex((item) => item.id === body.id || item.name.toLowerCase() === body.name.toLowerCase());

    const savedProfile: SavedMemberProfile = {
      ...body,
      id: body.id || crypto.randomUUID(),
      updatedAt: now,
      createdAt: body.createdAt || now,
    };

    if (existingIndex >= 0) {
      currentList[existingIndex] = savedProfile;
    } else {
      currentList.unshift(savedProfile);
    }

    // Save back into Postgres database (ApiCache table)
    await prisma.apiCache.upsert({
      where: { cacheKey },
      update: {
        payload: currentList as any,
        expiresAt: new Date(Date.now() + ONE_YEAR_MS),
      },
      create: {
        cacheKey,
        payload: currentList as any,
        expiresAt: new Date(Date.now() + ONE_YEAR_MS),
      },
    });

    return NextResponse.json({
      status: "ok",
      profile: savedProfile,
      savedToDatabase: true,
    });
  } catch (error) {
    console.error("Failed to save profile to database:", error);
    return NextResponse.json({ error: "Database save failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const viewer = await currentViewer().catch(() => null);
    const workspaceId = viewer?.workspaceId ?? null;
    const cacheKey = getCacheKey(workspaceId);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Profile id is required" }, { status: 400 });
    }

    const cachedRecord = await prisma.apiCache.findUnique({
      where: { cacheKey },
    });

    if (cachedRecord && Array.isArray(cachedRecord.payload)) {
      const currentList = cachedRecord.payload as unknown as SavedMemberProfile[];
      const nextList = currentList.filter((p) => p.id !== id);

      await prisma.apiCache.update({
        where: { cacheKey },
        data: {
          payload: nextList as any,
        },
      });
    }

    return NextResponse.json({
      status: "ok",
      deletedId: id,
      deletedFromDatabase: true,
    });
  } catch (error) {
    console.error("Failed to delete profile from database:", error);
    return NextResponse.json({ error: "Database delete failed" }, { status: 500 });
  }
}
