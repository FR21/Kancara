"use client";

import { CircleAlert, Loader2, Trash2 } from "lucide-react";
import { type MouseEvent, useEffect, useId, useRef } from "react";
import { DANGER_BUTTON, GHOST_BUTTON } from "@/components/ui/styles";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  pendingLabel: string;
  pending: boolean;
  /** Shown above the buttons when the last attempt failed, so the visitor can try again from the same place. */
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

// Asks before something that cannot be taken back. The dialog does nothing on its own: the caller decides
// what confirming means and when the dialog closes.
export default function ConfirmDialog({
  open,
  title,
  body,
  cancelLabel,
  confirmLabel,
  pendingLabel,
  pending,
  error,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget && !pending) onCancel();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onClose={onCancel}
      onClick={closeOnBackdrop}
      className="m-auto w-full max-w-md bg-transparent p-4 text-text backdrop:bg-neutral-950/70 open:motion-safe:animate-message-in"
    >
      <div className="rounded-surface bg-background p-surface shadow-xl shadow-neutral-950/40">
        <h2 id={titleId} className="text-h3 text-balance text-text">
          {title}
        </h2>
        <p id={bodyId} className="mt-2 text-body text-pretty text-text-muted">
          {body}
        </p>

        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 text-body-sm text-error">
            <CircleAlert className="mt-1 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={pending} className={GHOST_BUTTON}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={pending} className={DANGER_BUTTON}>
            {pending ? (
              <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-4" aria-hidden="true" />
            )}
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
