"use client";

import { Check, CircleAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** `duration` overrides how long this one notice stays, for one that is only a glance. */
export type NoticeMessage = { id: number; tone: "success" | "error"; message: string; duration?: number };

type NoticeProps = {
  /** The notice to show, or null for none. A new `id` is a new notice, even with the same words. */
  notice: NoticeMessage | null;
  dismissLabel: string;
  /** How long it stays before it leaves by itself. An error stays until it is dismissed. */
  duration?: number;
  onDismiss: () => void;
};

const DEFAULT_MS = 5000;
// As long as the leave animation in globals.css, with a little to spare for a browser that never reports its end.
const LEAVE_MS = 220;

// The one notice of the whole app: a short line about something that just happened. It drops in right under the
// fixed navbar so it is never covered or obscured, shows how long it will stay as a line that runs out, and lifts
// away again. It portals directly to document.body at z-[70] to escape any parent stacking contexts.
export default function Notice({ notice, dismissLabel, duration = DEFAULT_MS, onDismiss }: NoticeProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // The notice on screen outlives the one asked for by the length of its leave, so it can be seen going.
  const [shown, setShown] = useState<NoticeMessage | null>(notice);
  const [leaving, setLeaving] = useState(false);
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  if (notice && notice.id !== shown?.id) {
    setShown(notice);
    setLeaving(false);
  }
  if (!notice && shown && !leaving) setLeaving(true);

  const stays = shown?.tone === "error";
  const stayMs = shown?.duration ?? duration;
  useEffect(() => {
    if (!shown || leaving || stays) return;
    const timer = setTimeout(() => dismissRef.current(), stayMs);
    return () => clearTimeout(timer);
  }, [shown, leaving, stays, stayMs]);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => {
      setShown(null);
      setLeaving(false);
    }, LEAVE_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  if (!mounted) return null;

  const content = (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-4 pt-[max(5.75rem,calc(env(safe-area-inset-top)+4.75rem))] sm:pt-[max(6.5rem,calc(env(safe-area-inset-top)+5.25rem))]"
    >
      {shown && (
        <div
          key={shown.id}
          className={`pointer-events-auto relative flex max-w-md items-center gap-3 overflow-clip rounded-full border border-border bg-surface/95 py-2.5 pr-2.5 pl-4 shadow-xl shadow-neutral-950/15 backdrop-blur-md ${
            leaving ? "motion-safe:animate-notice-out" : "motion-safe:animate-notice-in"
          }`}
        >
          {shown.tone === "success" ? (
            <Check className="size-5 shrink-0 text-success motion-safe:animate-stamp-in motion-safe:[animation-delay:120ms]" strokeWidth={3} aria-hidden="true" />
          ) : (
            <CircleAlert className="size-5 shrink-0 text-error" aria-hidden="true" />
          )}
          <p className="min-w-0 flex-1 text-body-sm text-pretty text-text">{shown.message}</p>
          <button
            type="button"
            aria-label={dismissLabel}
            title={dismissLabel}
            onClick={onDismiss}
            className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-muted transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-muted hover:text-text active:scale-[0.97]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
          {/* The time left, as a line along the foot that runs out. It is decoration: the notice leaves on its timer. */}
          {!stays && !leaving && (
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-success/60 motion-safe:animate-notice-time"
              style={{ animationDuration: `${stayMs}ms` }}
            />
          )}
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
