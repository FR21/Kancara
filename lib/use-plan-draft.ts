import { useSyncExternalStore } from "react";
import { type PlanDraft, parsePlanDraft } from "@/lib/plan-draft";

const STORAGE_KEY = "kancara-plan-draft-v2";
const TRIP_KEY = "kancara-plan-draft-trip";
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedDraft: PlanDraft | null = null;

function parseSavedDraft(raw: string): PlanDraft | null {
  try {
    return parsePlanDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

function getSnapshot(): PlanDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedDraft;
    cachedRaw = raw;
    cachedDraft = raw === null ? null : parseSavedDraft(raw);
    return cachedDraft;
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useSavedDraft(): PlanDraft | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function saveDraft(draft: PlanDraft) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    return;
  }
  listeners.forEach((listener) => listener());
}

/** The draft trip the plan on this device was kept as when its group link was made, so resuming carries on in it. */
export function readDraftTrip(): string | null {
  try {
    return localStorage.getItem(TRIP_KEY);
  } catch {
    return null;
  }
}

export function keepDraftTrip(tripId: string) {
  try {
    localStorage.setItem(TRIP_KEY, tripId);
  } catch {
    // The link works all the same; a plan resumed later is kept as a new trip.
  }
}

/** A plan started afresh has nothing to do with the trip an earlier one was kept as. */
export function forgetDraftTrip() {
  try {
    localStorage.removeItem(TRIP_KEY);
  } catch {
    // Nothing was kept, so there is nothing to forget.
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TRIP_KEY);
    cachedRaw = null;
    cachedDraft = null;
  } catch {
    return;
  }
  listeners.forEach((listener) => listener());
}

