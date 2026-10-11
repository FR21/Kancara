"use client";

import { Loader2, Trash2 } from "lucide-react";
import { type MouseEvent, useEffect, useRef } from "react";
import { GHOST_BUTTON } from "@/components/plan/styles";
import { fillTemplate } from "@/lib/plan-draft";
import { useMessages } from "@/lib/use-messages";

type DeleteProfileDialogProps = {
  name: string | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteProfileDialog({
  name,
  pending,
  onCancel,
  onConfirm,
}: DeleteProfileDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const t = useMessages("savedProfiles");
  const open = name !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onCancel();
  };

  const title = fillTemplate(t.deleteDialog.title, { name: name ?? "" });
  const body = t.deleteDialog.body;
  const cancelText = t.deleteDialog.cancel;
  const confirmText = t.deleteDialog.confirm;
  const deletingText = t.deleteDialog.pending;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="saved-profile-delete-title"
      aria-describedby="saved-profile-delete-body"
      onClose={onCancel}
      onClick={closeOnBackdrop}
      className="m-auto w-full max-w-md bg-transparent p-4 text-text backdrop:bg-neutral-950/70 open:motion-safe:animate-message-in"
    >
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-xl shadow-neutral-950/40">
        <h2 id="saved-profile-delete-title" className="text-h3 text-balance text-text">
          {title}
        </h2>
        <p id="saved-profile-delete-body" className="mt-2 text-body text-pretty text-text-muted">
          {body}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={pending} className={GHOST_BUTTON}>
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-error px-6 text-label-lg text-on-error transition-[scale,opacity] duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? (
              <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-4" aria-hidden="true" />
            )}
            {pending ? deletingText : confirmText}
          </button>
        </div>
      </div>
    </dialog>
  );
}
