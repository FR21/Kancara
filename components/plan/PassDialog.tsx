"use client";

import { X } from "lucide-react";
import { type MouseEvent, useEffect, useRef } from "react";
import type { Messages } from "@/lib/messages";
import type { PlanDraft } from "@/lib/plan-draft";
import TicketCard from "./TicketCard";

type PassDialogProps = {
  open: boolean;
  draft: PlanDraft;
  text: Messages["plan"];
  onClose: () => void;
};

export default function PassDialog({ open, draft, text, onClose }: PassDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="pass-dialog-title"
      onClose={onClose}
      onClick={closeOnBackdrop}
      className="m-auto max-h-dvh w-full max-w-5xl bg-transparent p-4 text-text backdrop:bg-neutral-950/70 open:motion-safe:animate-message-in"
    >
      <div className="rounded-3xl bg-background p-4 shadow-xl shadow-neutral-950/40 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="pass-dialog-title" className="text-h3 text-text">
            {text.deck.previewTitle}
          </h2>
          <button
            type="button"
            aria-label={text.deck.previewClose}
            title={text.deck.previewClose}
            onClick={onClose}
            className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-text transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.97]"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {open && (
          <TicketCard draft={draft} text={text}>
            <p className="text-caption text-text-muted">{text.deck.previewNote}</p>
          </TicketCard>
        )}
      </div>
    </dialog>
  );
}
