"use client";

import { X } from "lucide-react";
import { type MouseEvent, useEffect, useRef } from "react";
import type { Messages } from "@/lib/messages";

type LegalModalProps = {
  open: boolean;
  type: "privacy" | "terms" | null;
  text: Messages["legal"];
  onClose: () => void;
};

export default function LegalModal({ open, type, text, onClose }: LegalModalProps) {
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

  if (!type) return null;
  const content = text[type];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={closeOnBackdrop}
      className="m-auto max-h-[85dvh] w-full max-w-3xl bg-transparent p-4 text-text backdrop:bg-neutral-950/70 open:motion-safe:animate-message-in"
    >
      <div className="rounded-3xl bg-background p-6 shadow-xl shadow-neutral-950/40 flex flex-col h-full max-h-[calc(85dvh-2rem)]">
        <div className="mb-4 flex items-center justify-between gap-3 shrink-0">
          <h2 className="font-heading text-h3 text-text">
            {content.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-text transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.97]"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto pr-2">
          <p className="text-body-sm text-text-muted mb-8">{content.lastUpdated}</p>
          <div className="flex flex-col gap-6">
            {content.sections.map((section, idx) => (
              <section key={idx}>
                <h3 className="font-heading text-label text-text">{section.heading}</h3>
                <div className="mt-2 flex flex-col gap-2 text-body-sm text-text-muted">
                  {section.body.split("\n").map((line, i) => {
                    if (line.startsWith("- ")) {
                      return (
                        <li key={i} className="ml-4 list-disc">
                          {line.slice(2)}
                        </li>
                      );
                    }
                    return <p key={i}>{line}</p>;
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </dialog>
  );
}
