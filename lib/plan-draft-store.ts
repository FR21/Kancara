import { useSyncExternalStore } from "react";
import { type PlanDraft, parsePlanDraft } from "./plan-draft";

const STORAGE_KEY = "kancara-plan-draft-v2";
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
