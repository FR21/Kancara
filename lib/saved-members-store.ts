"use client";

import { useEffect, useState } from "react";
import type { AgeGroup, CustomInterest, InterestKey, Member, NeedKey, WishLevel } from "./plan-draft";

export type SavedMemberProfile = {
  id: string;
  name: string;
  relationship: string; // e.g. "Ayah", "Ibu", "Kakek", "Nenek", "Anak", "Teman"
  ageGroup: AgeGroup;
  age: number | null;
  needs: NeedKey[];
  customNeeds: string[];
  allergies: string;
  interests: Partial<Record<InterestKey, WishLevel>>;
  customInterests: CustomInterest[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "kancara_saved_member_profiles_v1";


export function getSavedProfiles(): SavedMemberProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function saveProfilesToStorage(profiles: SavedMemberProfile[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    window.dispatchEvent(new Event("kancara-saved-profiles-changed"));
  } catch (err) {
    console.error("Failed to save profiles to localStorage", err);
  }
}

export function saveProfile(
  data: Omit<SavedMemberProfile, "id" | "createdAt" | "updatedAt"> & { id?: string },
): SavedMemberProfile {
  const current = getSavedProfiles();
  const now = new Date().toISOString();

  if (data.id) {
    const existingIndex = current.findIndex((item) => item.id === data.id);
    if (existingIndex >= 0) {
      const updated: SavedMemberProfile = {
        ...current[existingIndex],
        ...data,
        id: data.id,
        updatedAt: now,
      };
      current[existingIndex] = updated;
      saveProfilesToStorage(current);
      // Asynchronously sync to database
      fetch("/api/saved-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch((e) => console.warn("Background DB sync notice:", e));
      return updated;
    }
  }

  const created: SavedMemberProfile = {
    ...data,
    id: data.id || crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  const next = [created, ...current];
  saveProfilesToStorage(next);
  // Asynchronously sync to database
  fetch("/api/saved-profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(created),
  }).catch((e) => console.warn("Background DB sync notice:", e));
  return created;
}

export function deleteSavedProfile(id: string): void {
  const current = getSavedProfiles();
  const next = current.filter((item) => item.id !== id);
  saveProfilesToStorage(next);
  // Asynchronously sync to database
  fetch(`/api/saved-profiles?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).catch((e) => console.warn("Background DB sync notice:", e));
}


/** Converts a Member from a trip plan into a permanent SavedMemberProfile. */
export function memberToSavedProfile(
  member: Member,
  relationship = "Keluarga",
  notes = "",
): SavedMemberProfile {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: member.name || "Anggota Rombongan",
    relationship,
    ageGroup: member.ageGroup,
    age: member.age,
    needs: [...member.needs],
    customNeeds: [...member.customNeeds],
    allergies: member.allergies || "",
    interests: { ...member.interests },
    customInterests: [...member.customInterests],
    notes,
    createdAt: now,
    updatedAt: now,
  };
}

/** Converts a SavedMemberProfile into a fresh trip Member with a new unique ID. */
export function savedProfileToMember(profile: SavedMemberProfile): Member {
  return {
    id: crypto.randomUUID(),
    name: profile.name,
    ageGroup: profile.ageGroup,
    age: profile.age,
    needs: [...profile.needs],
    customNeeds: [...profile.customNeeds],
    allergies: profile.allergies,
    interests: { ...profile.interests },
    customInterests: [...profile.customInterests],
  };
}

export function useSavedProfiles() {
  const [profiles, setProfiles] = useState<SavedMemberProfile[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1. Initial state from local storage
    const local = getSavedProfiles();
    setProfiles(local);
    setMounted(true);

    // 2. Fetch active profiles from Postgres database
    fetch("/api/saved-profiles")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.profiles) && data.profiles.length > 0) {
          setProfiles(data.profiles);
          saveProfilesToStorage(data.profiles);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch profiles from database, using cached profiles:", err);
      });

    const onUpdate = () => {
      setProfiles(getSavedProfiles());
    };

    window.addEventListener("kancara-saved-profiles-changed", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("kancara-saved-profiles-changed", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  return {
    profiles: mounted ? profiles : [],
    isLoaded: mounted,
    save: (data: Omit<SavedMemberProfile, "id" | "createdAt" | "updatedAt"> & { id?: string }) => {
      const res = saveProfile(data);
      setProfiles(getSavedProfiles());
      return res;
    },
    remove: (id: string) => {
      deleteSavedProfile(id);
      setProfiles(getSavedProfiles());
    },
  };
}
