"use client";

import { useEffect, useRef } from "react";

/**
 * Lets a card lean toward the cursor. The hook only writes --tilt-x and
 * --tilt-y (in degrees) on the element; the element decides how to use them.
 * It does nothing on touch screens or when the visitor asked for less motion.
 */
export function useTilt<Target extends HTMLElement>(maxDegrees = 3) {
  const targetRef = useRef<Target>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let leanX = 0;
    let leanY = 0;

    const paint = () => {
      frame = 0;
      target.style.setProperty("--tilt-x", `${(leanX * maxDegrees).toFixed(2)}deg`);
      target.style.setProperty("--tilt-y", `${(leanY * maxDegrees).toFixed(2)}deg`);
    };

    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(paint);
    };

    const handleMove = (event: PointerEvent) => {
      const box = target.getBoundingClientRect();
      leanX = ((event.clientX - box.left) / box.width - 0.5) * 2;
      leanY = ((event.clientY - box.top) / box.height - 0.5) * 2;
      schedule();
    };

    const handleLeave = () => {
      leanX = 0;
      leanY = 0;
      schedule();
    };

    target.addEventListener("pointermove", handleMove, { passive: true });
    target.addEventListener("pointerleave", handleLeave);

    return () => {
      cancelAnimationFrame(frame);
      target.removeEventListener("pointermove", handleMove);
      target.removeEventListener("pointerleave", handleLeave);
    };
  }, [maxDegrees]);

  return targetRef;
}
