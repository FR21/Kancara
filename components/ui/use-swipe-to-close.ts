"use client";

import { type PointerEvent, type RefObject, useRef } from "react";

/** How far a sheet must be pulled down, or how fast it must be flicked, before letting go closes it. */
const CLOSE_DISTANCE = 96;
const CLOSE_SPEED = 0.6;
/** Movement under this is a tap (on the close button, say), not a pull. */
const PULL_START = 8;
const SETTLE = "translate 200ms cubic-bezier(0.23, 1, 0.32, 1)";

type Pull = { pointerId: number; startY: number; startTime: number; pulling: boolean };

// A bottom sheet on a phone closes the way phone sheets do: pull its grab bar down and let go. The sheet follows
// the finger, springs back when let go early, and slides away when pulled far or flicked. Only touch on a phone
// counts; from 640px the sheet is a centred dialog and has no grab bar. The pointer is captured only once the pull
// has started, so a tap on a button inside the grab area (the close button) is still a tap.
export function useSwipeToClose<Target extends HTMLElement>(targetRef: RefObject<Target | null>, onClose: () => void) {
  const pull = useRef<Pull | null>(null);

  const place = (offset: number, transition: string) => {
    const target = targetRef.current;
    if (!target) return;
    target.style.transition = transition;
    target.style.translate = offset > 0 ? `0 ${offset}px` : "";
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "touch" || window.matchMedia("(min-width: 40rem)").matches) return;
    pull.current = { pointerId: event.pointerId, startY: event.clientY, startTime: performance.now(), pulling: false };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const current = pull.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const offset = Math.max(0, event.clientY - current.startY);
    if (!current.pulling) {
      if (offset < PULL_START) return;
      current.pulling = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    place(offset, "none");
  };

  const finish = (event: PointerEvent<HTMLElement>, cancelled: boolean) => {
    const current = pull.current;
    if (!current || current.pointerId !== event.pointerId) return;
    pull.current = null;
    if (!current.pulling) return;
    const offset = Math.max(0, event.clientY - current.startY);
    const speed = offset / Math.max(1, performance.now() - current.startTime);
    if (cancelled || (offset < CLOSE_DISTANCE && speed < CLOSE_SPEED)) {
      place(0, SETTLE);
      return;
    }
    const target = targetRef.current;
    if (target) place(target.offsetHeight, SETTLE);
    // The sheet finishes sliding away, then closes; its position is reset for the next time it opens.
    window.setTimeout(() => {
      onClose();
      window.setTimeout(() => place(0, "none"), 50);
    }, 180);
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: (event: PointerEvent<HTMLElement>) => finish(event, false),
    onPointerCancel: (event: PointerEvent<HTMLElement>) => finish(event, true),
  };
}
