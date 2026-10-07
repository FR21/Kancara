"use client";

import { CopyPlus, EllipsisVertical, Share2, Trash2 } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import type { TripCard } from "@/lib/trips/trip";

export type TripActions = {
  onDuplicate: (card: TripCard) => void;
  onShare: (card: TripCard) => void;
  onDelete: (card: TripCard) => void;
};

type TripMenuProps = {
  card: TripCard;
  name: string;
  text: Messages["trips"]["menu"];
  actions: TripActions;
  onBand?: boolean;
  className?: string;
};

const ITEM =
  "flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-label transition-colors duration-150 ease-out";

export default function TripMenu({ card, name, text, actions, onBand = false, className = "" }: TripMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  // Only the organizer may delete; invited members still duplicate and share.
  const canDelete = card.role === "organizer";

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  const closeAndRefocus = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const choose = (action: (card: TripCard) => void) => {
    closeAndRefocus();
    action(card);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key === "Escape") {
      closeAndRefocus();
      return;
    }
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const current = items.findIndex((item) => item === document.activeElement);
    const targets: Record<string, number> = {
      ArrowDown: (current + 1) % items.length,
      ArrowUp: (current - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    items[target]?.focus();
  };

  const buttonTone = onBand
    ? "text-on-primary hover:bg-on-primary/15 focus-visible:outline-on-primary"
    : "text-text-muted hover:bg-surface-muted hover:text-text";

  return (
    <div ref={rootRef} className={className}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={fillTemplate(text.label, { name })}
        title={fillTemplate(text.label, { name })}
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex size-11 cursor-pointer items-center justify-center rounded-full transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.97] ${buttonTone}`}
      >
        <EllipsisVertical className="size-5" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={fillTemplate(text.label, { name })}
          onKeyDown={handleKeyDown}
          className="absolute top-full right-0 z-30 mt-1 min-w-48 origin-top-right rounded-2xl border border-border bg-background p-1 shadow-lg shadow-neutral-950/10 motion-safe:animate-pop-in"
        >
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => choose(actions.onDuplicate)}
            className={`${ITEM} text-text hover:bg-surface-muted focus-visible:bg-surface-muted`}
          >
            <CopyPlus className="size-4 text-text-muted" aria-hidden="true" />
            {text.duplicate}
          </button>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => choose(actions.onShare)}
            className={`${ITEM} text-text hover:bg-surface-muted focus-visible:bg-surface-muted`}
          >
            <Share2 className="size-4 text-text-muted" aria-hidden="true" />
            {text.share}
          </button>
          {canDelete && (
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => choose(actions.onDelete)}
              className={`${ITEM} text-error hover:bg-error-subtle focus-visible:bg-error-subtle`}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {text.delete}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
