import { useEffect, useRef, useState } from "react";
import { type MemoryAuthor, type NewMemory, type TripMemory, tripMemories } from "@/lib/client/trip-memories";

export type AlbumStatus = "loading" | "ready" | "failed";

export type MemoryAlbum = {
  memories: TripMemory[];
  authors: MemoryAuthor[];
  total: number;
  status: AlbumStatus;
  /** The author whose memories are shown, or null for everyone's. */
  author: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  moreFailed: boolean;
  showAuthor: (author: string | null) => void;
  retry: () => void;
  loadMore: () => void;
  add: (memory: NewMemory) => Promise<void>;
  remove: (memoryId: string) => Promise<void>;
};

function countAuthor(authors: MemoryAuthor[], name: string, change: number): MemoryAuthor[] {
  const known = authors.some((entry) => entry.name === name);
  const counted = known ? authors : [...authors, { name, count: 0 }];
  return counted
    .map((entry) => (entry.name === name ? { ...entry, count: entry.count + change } : entry))
    .filter((entry) => entry.count > 0)
    .sort((first, second) => first.name.localeCompare(second.name));
}

// The trip's shared album, a page at a time. Adding and removing change the list on screen straight away from
// the server's answer, so the pages already read do not have to be fetched again.
export function useMemoryAlbum(tripId: string): MemoryAlbum {
  const [memories, setMemories] = useState<TripMemory[]>([]);
  const [authors, setAuthors] = useState<MemoryAuthor[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<AlbumStatus>("loading");
  const [author, setAuthor] = useState<string | null>(null);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [reloads, setReloads] = useState(0);
  const moreRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // A page still on its way belongs to the list being replaced.
    moreRef.current?.abort();
    const controller = new AbortController();
    tripMemories.list(tripId, 0, author, controller.signal).then(
      (page) => {
        setMemories(page.memories);
        setAuthors(page.authors);
        setTotal(page.total);
        setNextOffset(page.nextOffset);
        setStatus("ready");
      },
      () => {
        if (!controller.signal.aborted) setStatus("failed");
      },
    );
    return () => controller.abort();
  }, [tripId, author, reloads]);

  useEffect(() => () => moreRef.current?.abort(), []);

  const showAuthor = (next: string | null) => {
    if (next === author) return;
    setStatus("loading");
    setLoadingMore(false);
    setMoreFailed(false);
    setAuthor(next);
  };

  const retry = () => {
    setStatus("loading");
    setReloads((count) => count + 1);
  };

  const loadMore = async () => {
    if (nextOffset === null || loadingMore) return;
    const controller = new AbortController();
    moreRef.current = controller;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const page = await tripMemories.list(tripId, nextOffset, author, controller.signal);
      setMemories((current) => [
        ...current,
        ...page.memories.filter((memory) => !current.some((shown) => shown.id === memory.id)),
      ]);
      setAuthors(page.authors);
      setTotal(page.total);
      setNextOffset(page.nextOffset);
    } catch {
      if (!controller.signal.aborted) setMoreFailed(true);
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  };

  const add = async (memory: NewMemory) => {
    const created = await tripMemories.add(tripId, memory);
    if (author === null || author === created.authorName) setMemories((current) => [created, ...current]);
    setAuthors((current) => countAuthor(current, created.authorName, 1));
    setTotal((count) => count + 1);
  };

  const remove = async (memoryId: string) => {
    await tripMemories.remove(tripId, memoryId);
    const removed = memories.find((memory) => memory.id === memoryId);
    setMemories((current) => current.filter((memory) => memory.id !== memoryId));
    if (removed) setAuthors((current) => countAuthor(current, removed.authorName, -1));
    setTotal((count) => Math.max(0, count - 1));
    // The last memory of the person being shown is gone, so everyone's are shown again.
    const lastOfAuthor = authors.find((entry) => entry.name === author)?.count === 1;
    if (removed && author !== null && lastOfAuthor) showAuthor(null);
  };

  return {
    memories,
    authors,
    total,
    status,
    author,
    hasMore: nextOffset !== null,
    loadingMore,
    moreFailed,
    showAuthor,
    retry,
    loadMore,
    add,
    remove,
  };
}
