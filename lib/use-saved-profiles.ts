"use client";

import { useEffect, useRef, useState } from "react";
import { forgetLegacyProfileCopy, savedProfiles, SavedProfilesError } from "@/lib/client/saved-profiles";
import { sameText } from "@/lib/plan-draft";
import type { SavedProfile, SavedProfileDraft, SavedProfileList } from "@/lib/saved-profiles/profile";

export type SavedProfilesStatus = "loading" | "ready" | "failed";

const EMPTY_LIST: SavedProfileList = { profiles: [], suggestions: [] };

function byName(first: SavedProfile, second: SavedProfile): number {
  return first.name.localeCompare(second.name);
}

/**
 * The viewer's saved people and the people of past trips who could be saved. `initial` is the list the server
 * already read for the page; without it the list is fetched once the component mounts. Nothing is kept on the
 * device: the profiles hold allergies and notes, so they live only in memory while the page is open.
 */
export function useSavedProfiles(initial?: SavedProfileList) {
  const [list, setList] = useState<SavedProfileList | null>(initial ?? null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const skipFetch = useRef(initial !== undefined);

  useEffect(() => {
    forgetLegacyProfileCopy();
    if (skipFetch.current) {
      skipFetch.current = false;
      return;
    }
    const controller = new AbortController();
    savedProfiles
      .list(controller.signal)
      .then((loaded) => {
        setList(loaded);
        setFailed(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [attempt]);

  const reload = () => {
    setFailed(false);
    setAttempt((count) => count + 1);
  };

  /** Saves a person: updates the one with this id, or keeps a new one when there is none. Throws when it fails. */
  const save = async (draft: SavedProfileDraft, id: string | null): Promise<SavedProfile> => {
    const saved = id === null ? await savedProfiles.create(draft) : await savedProfiles.update(id, draft);
    setList((current) => {
      const { profiles, suggestions } = current ?? EMPTY_LIST;
      return {
        profiles: [...profiles.filter((profile) => profile.id !== saved.id), saved].sort(byName),
        suggestions: suggestions.filter((suggestion) => !sameText(suggestion.profile.name, saved.name)),
      };
    });
    return saved;
  };

  /** Removes a person. One already gone counts as removed. Throws when it fails. */
  const remove = async (id: string): Promise<void> => {
    try {
      await savedProfiles.remove(id);
    } catch (error) {
      if (!(error instanceof SavedProfilesError && error.status === 404)) throw error;
    }
    setList((current) => {
      const { profiles, suggestions } = current ?? EMPTY_LIST;
      return { profiles: profiles.filter((profile) => profile.id !== id), suggestions };
    });
  };

  let status: SavedProfilesStatus = "loading";
  if (list) status = "ready";
  else if (failed) status = "failed";

  return {
    status,
    profiles: list?.profiles ?? [],
    suggestions: list?.suggestions ?? [],
    reload,
    save,
    remove,
  };
}
