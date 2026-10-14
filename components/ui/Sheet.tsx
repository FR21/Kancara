"use client";

import { X } from "lucide-react";
import { type MouseEvent, type ReactNode, useEffect, useId, useRef } from "react";
import IconButton from "@/components/ui/IconButton";

type SheetProps = {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  /** Actions that stay in reach at the foot while the content scrolls. */
  footer?: ReactNode;
};

// The help page's dialogs: a sheet rising from the bottom edge on a phone, where a thumb reaches it, and a
// centred dialog from 640px. The same shape as a stop's details in the itinerary.
export default function Sheet({ open, title, closeLabel, onClose, children, footer }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // True while the sheet is being closed from outside, so that close is not reported back as the visitor's.
  const closingRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) {
      closingRef.current = true;
      dialog.close();
    }
  }, [open]);

  const handleClose = () => {
    if (closingRef.current) closingRef.current = false;
    else onClose();
  };

  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={handleClose}
      onClick={closeOnBackdrop}
      className="mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-surface bg-background p-0 text-text backdrop:bg-neutral-950/70 open:flex open:motion-safe:animate-sheet-up sm:m-auto sm:max-h-[86dvh] sm:max-w-xl sm:rounded-surface sm:open:motion-safe:animate-message-in"
    >
      {open && (
        <>
          <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-strong sm:hidden" />
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border py-1 pr-2 pl-surface sm:py-2">
            <h2 id={titleId} className="min-w-0 text-h3 text-pretty text-text">
              {title}
            </h2>
            <IconButton label={closeLabel} onClick={onClose}>
              <X className="size-5" aria-hidden="true" />
            </IconButton>
          </div>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-surface [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]">
            {children}
          </div>
          {footer && <div className="safe-bottom flex shrink-0 flex-wrap gap-3 border-t border-border px-surface pt-3">{footer}</div>}
        </>
      )}
    </dialog>
  );
}
