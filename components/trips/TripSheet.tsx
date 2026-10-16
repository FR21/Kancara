"use client";

import { type MouseEvent, type ReactNode, useEffect, useRef } from "react";

type TripSheetProps = {
  open: boolean;
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
};

// The trip detail on a phone or tablet: a sheet that rises from the bottom edge.
export default function TripSheet({ open, labelledBy, onClose, children }: TripSheetProps) {
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
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={closeOnBackdrop}
      className="mx-auto mt-auto mb-0 max-h-[90dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-surface bg-surface p-0 text-text [--surface-pad:1.5rem] backdrop:bg-neutral-950/70 open:motion-safe:animate-sheet-up sm:m-auto sm:max-h-[86dvh] sm:rounded-surface"
    >
      {open && children}
    </dialog>
  );
}
