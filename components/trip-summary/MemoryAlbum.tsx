"use client";

import { Camera, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import MemoryCard from "@/components/trip-summary/MemoryCard";
import MemoryFormSheet from "@/components/trip-summary/MemoryFormSheet";
import type { MemoryAlbum as Album } from "@/components/trip-summary/use-memory-album";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import ErrorAlert from "@/components/ui/ErrorAlert";
import { buttonClass, choiceClass } from "@/components/ui/styles";
import { useListArrival } from "@/components/ui/use-list-arrival";
import type { NewMemory, TripMemory } from "@/lib/client/trip-memories";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";

type MemoryAlbumProps = {
  album: Album;
  days: number;
  defaultDay: number;
  places: string[];
  members: string[];
  locale: string;
  text: Messages["tripSummary"];
  onNotice: (message: string) => void;
};

// Shaped like a MemoryCard: the photo, the place, a line of the story, and the footer of when and by whom.
function MemoryCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`surface-compact rounded-surface border border-border bg-surface p-surface ${className}`}>
      <div className="aspect-4/3 rounded-lg bg-surface-muted" />
      <div className="mt-3 h-6 w-3/4 rounded-lg bg-surface-muted" />
      <div className="mt-2 h-4 w-full rounded-lg bg-surface-muted" />
      <div className="mt-4 border-t border-border pt-4">
        <div className="h-4 w-1/2 rounded-lg bg-surface-muted" />
      </div>
    </div>
  );
}

// The group's shared album: photos and stories anyone in the trip can add, newest first, by one person or all.
export default function MemoryAlbum({ album, days, defaultDay, places, members, locale, text, onNotice }: MemoryAlbumProps) {
  const momentsText = text.moments;
  const [formOpen, setFormOpen] = useState(false);
  // A new key gives every opening of the form a fresh, empty one.
  const [formKey, setFormKey] = useState(0);
  const [removing, setRemoving] = useState<TripMemory | null>(null);
  const [removePending, setRemovePending] = useState(false);
  const [removeFailed, setRemoveFailed] = useState(false);
  const arrivalOf = useListArrival(album.memories.map((memory) => memory.id));

  const openForm = () => {
    setFormKey((key) => key + 1);
    setFormOpen(true);
  };

  const save = async (memory: NewMemory) => {
    await album.add(memory);
    setFormOpen(false);
    onNotice(momentsText.saved);
  };

  const askRemove = (memory: TripMemory) => {
    setRemoveFailed(false);
    setRemoving(memory);
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setRemovePending(true);
    setRemoveFailed(false);
    try {
      await album.remove(removing.id);
      setRemoving(null);
      onNotice(momentsText.removed);
    } catch {
      setRemoveFailed(true);
    } finally {
      setRemovePending(false);
    }
  };

  const addButton = (
    <button type="button" onClick={openForm} className={buttonClass("primary")}>
      <Plus className="size-4" aria-hidden="true" />
      {momentsText.add}
    </button>
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="min-w-0 max-w-2xl flex-1 basis-64 text-body text-pretty text-text-muted">{momentsText.intro}</p>
          {album.total > 0 && addButton}
        </div>

        {album.authors.length > 1 && (
          <div role="group" aria-label={momentsText.filterLabel} className="flex flex-wrap gap-2 motion-safe:animate-message-in">
            <button
              type="button"
              aria-pressed={album.author === null}
              onClick={() => album.showAuthor(null)}
              className={choiceClass(album.author === null)}
            >
              {fillTemplate(momentsText.all, { count: album.total })}
            </button>
            {album.authors.map((entry) => (
              <button
                key={entry.name}
                type="button"
                aria-pressed={album.author === entry.name}
                onClick={() => album.showAuthor(entry.name)}
                className={choiceClass(album.author === entry.name)}
              >
                {fillTemplate(momentsText.authorCount, { name: entry.name || momentsText.someone, count: entry.count })}
              </button>
            ))}
          </div>
        )}

        {album.status === "loading" && (
          <div>
            <span role="status" className="sr-only">
              {momentsText.loading}
            </span>
            <div aria-hidden="true" className="grid gap-4 motion-safe:animate-pulse sm:grid-cols-2 lg:grid-cols-3">
              <MemoryCardSkeleton />
              <MemoryCardSkeleton className="hidden sm:block" />
              <MemoryCardSkeleton className="hidden lg:block" />
            </div>
          </div>
        )}

        {album.status === "failed" && <ErrorAlert message={momentsText.error} retryLabel={text.retry} onRetry={album.retry} />}

        {album.status === "ready" && album.memories.length === 0 && (
          <EmptyState
            icon={Camera}
            title={momentsText.empty}
            body={momentsText.emptyHint}
            headingLevel={2}
            action={addButton}
          />
        )}

        {album.status === "ready" && album.memories.length > 0 && (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {album.memories.map((memory) => {
                const arrival = arrivalOf(memory.id);
                return (
                  <li key={memory.id} style={arrival.style} className={`flex ${arrival.className}`}>
                    <MemoryCard memory={memory} locale={locale} text={momentsText} onRemove={askRemove} />
                  </li>
                );
              })}
            </ul>
            {album.moreFailed && <ErrorAlert message={momentsText.error} retryLabel={text.retry} onRetry={album.loadMore} />}
            {album.hasMore && !album.moreFailed && (
              <div className="flex justify-center">
                <button type="button" onClick={album.loadMore} disabled={album.loadingMore} className={buttonClass("outline")}>
                  {album.loadingMore && <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />}
                  {momentsText.loadMore}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <MemoryFormSheet
        key={formKey}
        open={formOpen}
        days={days}
        defaultDay={defaultDay}
        places={places}
        members={members}
        locale={locale}
        text={momentsText}
        onClose={() => setFormOpen(false)}
        onSave={save}
      />

      <ConfirmDialog
        open={removing !== null}
        title={momentsText.confirm.title}
        body={momentsText.confirm.body}
        cancelLabel={momentsText.confirm.cancel}
        confirmLabel={momentsText.confirm.confirm}
        pendingLabel={momentsText.confirm.pending}
        pending={removePending}
        error={removeFailed ? momentsText.confirm.failed : null}
        onCancel={() => setRemoving(null)}
        onConfirm={confirmRemove}
      />
    </>
  );
}
