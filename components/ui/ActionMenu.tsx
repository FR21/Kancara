"use client";

import { type LucideIcon, MoreHorizontal } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import IconButton from "@/components/ui/IconButton";

export type ActionMenuItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** Destructive: drawn in red, set apart, and kept last by the caller. */
  danger?: boolean;
};

type ActionMenuProps = {
  /** What the "⋯" button is called for a screen reader, e.g. "More actions for Bali". */
  label: string;
  items: ActionMenuItem[];
};

const ITEM =
  "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-label transition-[background-color,color] duration-150 ease-out focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

// The secondary actions of one object (duplicate, share, delete) behind a "⋯" button, so the object's own
// content and its main action carry the card. The list opens under the button's right edge; arrows move through
// it, Escape or a click elsewhere closes it, and focus returns to the button.
export default function ActionMenu({ label, items }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  // Measured when the menu opens: true when the screen has no room for the list below the button.
  const [upward, setUpward] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const current = itemRefs.current.findIndex((item) => item === document.activeElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    itemRefs.current[(current + step + items.length) % items.length]?.focus();
  };

  return (
    <div ref={rootRef} className="relative shrink-0" onKeyDown={handleKeyDown}>
      <IconButton
        ref={buttonRef}
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          const rect = buttonRef.current?.getBoundingClientRect();
          // Each row is 44px, plus the list's 12px padding at both ends and its 8px gap from the button.
          const needed = items.length * 44 + 40;
          setUpward(rect !== undefined && window.innerHeight - rect.bottom < needed && rect.top > needed);
          setOpen((current) => !current);
        }}
        className={open ? "bg-surface-muted" : ""}
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </IconButton>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={`absolute right-0 z-30 w-56 surface-compact rounded-surface ${upward ? "bottom-full mb-2 origin-bottom-right" : "top-full mt-2 origin-top-right"} border border-border bg-background p-surface shadow-lg shadow-neutral-950/10 motion-safe:animate-pop-in`}
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            const tone = item.danger ? "text-error hover:bg-error-subtle" : "text-text hover:bg-surface-muted";
            return (
              <div key={item.key} className={item.danger && index > 0 ? "mt-2 border-t border-border pt-2" : ""}>
                <button
                  ref={(element) => {
                    itemRefs.current[index] = element;
                  }}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={`${ITEM} ${tone}`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
