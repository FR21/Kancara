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
      className="safe-bottom mx-auto mt-auto mb-0 max-h-[90dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-3xl bg-surface p-0 text-text backdrop:bg-neutral-950/70 open:motion-safe:animate-message-in"
    >
      {open && children}
    </dialog>
  );
}
