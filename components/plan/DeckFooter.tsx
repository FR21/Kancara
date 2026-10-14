import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { GHOST_BUTTON } from "@/components/ui/styles";

type DeckFooterProps = {
  backLabel: string;
  /** Null where there is no step to go back to, such as a question opened alone from the boarding pass. */
  onBack: (() => void) | null;
  /** Why the way on is closed, or how far along the visitor is. Beside the buttons from 640px, under them on a phone. */
  note: string | null;
  /** Lets the forward button point at the note as its description. */
  noteId: string;
  /** The way on: one button. */
  children: ReactNode;
};

/** An arrow that leans the way its button goes when the pointer is on it. */
export const FORWARD_ARROW = "size-4 transition-[translate] duration-200 ease-out group-hover:translate-x-1";

// The foot of a one-thing-per-screen flow (the questions, the clashes): back on the left, on on the right, kept in
// thumb reach at the bottom of the screen while the content above scrolls.
export default function DeckFooter({ backLabel, onBack, note, noteId, children }: DeckFooterProps) {
  return (
    <div className="safe-bottom sticky bottom-0 z-10 -mx-4 border-t border-border bg-background px-4 pt-3 sm:mx-0 sm:px-0">
      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <button type="button" onClick={onBack} className={`group ${GHOST_BUTTON} -ml-4`}>
            <ArrowLeft className="size-4 transition-[translate] duration-200 ease-out group-hover:-translate-x-1" aria-hidden="true" />
            {backLabel}
          </button>
        ) : (
          <span />
        )}
        <div className="flex min-w-0 items-center gap-4">
          {note && (
            <p id={noteId} className="hidden text-body-sm text-pretty text-text-muted tabular-nums sm:block">
              {note}
            </p>
          )}
          {children}
        </div>
      </div>
      {note && (
        <p aria-hidden="true" className="pt-2 text-center text-body-sm text-pretty text-text-muted tabular-nums sm:hidden">
          {note}
        </p>
      )}
    </div>
  );
}
