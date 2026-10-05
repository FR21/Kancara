"use client";

import { useEffect, useRef } from "react";

export function useCursorGlow<Area extends HTMLElement>() {
  const areaRef = useRef<Area>(null);

  useEffect(() => {
    const area = areaRef.current;
    if (!area || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const paint = () => {
      frame = 0;
      area.querySelectorAll<HTMLElement>("[data-cursor-glow]").forEach((target) => {
        const box = target.getBoundingClientRect();
        target.style.setProperty("--glow-x", `${pointerX - box.left}px`);
        target.style.setProperty("--glow-y", `${pointerY - box.top}px`);
      });
    };

    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(paint);
    };

    const handleMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      area.toggleAttribute("data-glow-active", true);
      schedule();
    };

    const handleLeave = () => area.removeAttribute("data-glow-active");

    const handleScroll = () => {
      if (area.hasAttribute("data-glow-active")) schedule();
    };

    area.addEventListener("pointermove", handleMove, { passive: true });
    area.addEventListener("pointerleave", handleLeave);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      area.removeEventListener("pointermove", handleMove);
      area.removeEventListener("pointerleave", handleLeave);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return areaRef;
}
