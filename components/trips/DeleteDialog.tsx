"use client";

import { CircleAlert, Loader2, Trash2 } from "lucide-react";
import { type MouseEvent, useEffect, useRef } from "react";
import { GHOST_BUTTON } from "@/components/plan/styles";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";

type DeleteDialogProps = {
  name: string | null;
  text: Messages["trips"]["delete"];
  pending: boolean;
  failed: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteDialog({ name, text, pending, failed, onCancel, onConfirm }: DeleteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
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

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="trips-delete-title"
      aria-describedby="trips-delete-body"
      onClose={onCancel}
      onClick={closeOnBackdrop}
      className="m-auto w-full max-w-md bg-transparent p-4 text-text backdrop:bg-neutral-950/70 open:motion-safe:animate-message-in"
    >
      <div className="rounded-3xl bg-background p-6 shadow-xl shadow-neutral-950/40">
        <h2 id="trips-delete-title" className="text-h3 text-balance text-text">
          {text.title}
        </h2>
        <p id="trips-delete-body" className="mt-2 text-body text-pretty text-text-muted">
          {fillTemplate(text.body, { name: name ?? "" })}
        </p>

        {failed && (
          <p role="alert" className="mt-4 flex items-start gap-2 text-body-sm text-error">
            <CircleAlert className="mt-1 size-4 shrink-0" aria-hidden="true" />
            {text.failed}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={pending} className={GHOST_BUTTON}>
            {text.cancel}
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
            {pending ? text.pending : text.confirm}
          </button>
        </div>
      </div>
    </dialog>
  );
}
