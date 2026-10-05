"use client";

import { useEffect, useRef } from "react";

type ErrorInstrumentProps = {
  kind: "compass" | "horizon";
};

const MAX_LEAN = 24;
const RING = "fill-none stroke-current";
const NEEDLE =
  "origin-center [rotate:var(--heading,0deg)] transition-[rotate] duration-500 ease-spring motion-safe:animate-needle-sway group-data-tracking/dial:animate-none";
const HORIZON =
  "origin-center [rotate:var(--lean,0deg)] transition-[rotate] duration-500 ease-spring motion-safe:animate-horizon-rock group-data-tracking/dial:animate-none";

export function ErrorInstrument({ kind }: ErrorInstrumentProps) {
  const dialRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const dial = dialRef.current;
    if (!dial) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let heading = 0;

    const paint = () => {
      frame = 0;
      const box = dial.getBoundingClientRect();
      const offsetX = pointerX - (box.left + box.width / 2);
      const offsetY = pointerY - (box.top + box.height / 2);
      const target = (Math.atan2(offsetY, offsetX) * 180) / Math.PI + 90;
      const turn = ((((target - heading) % 360) + 540) % 360) - 180;
      heading += turn;
      const lean = Math.max(-1, Math.min(1, offsetX / (window.innerWidth / 2))) * MAX_LEAN;
      dial.style.setProperty("--heading", `${heading.toFixed(1)}deg`);
      dial.style.setProperty("--lean", `${lean.toFixed(1)}deg`);
      dial.dataset.tracking = "";
    };

    const handleMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (frame === 0) frame = requestAnimationFrame(paint);
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handleMove);
    };
  }, []);

  return (
    <svg ref={dialRef} viewBox="0 0 100 100" aria-hidden="true" className="group/dial size-[0.78em] shrink-0">
      {kind === "compass" ? (
        <>
          <g className="stroke-text-muted" strokeWidth="3" strokeLinecap="round">
            <path d="M50 16v6M50 78v6M16 50h6M78 50h6" />
          </g>
          <g className={NEEDLE}>
            <path d="M50 22 42 50h16z" className="fill-accent" />
            <path d="M50 78 42 50h16z" className="fill-border-strong" />
            <circle cx="50" cy="50" r="5" className="fill-background stroke-current" strokeWidth="3" />
          </g>
        </>
      ) : (
        <>
          <clipPath id="error-horizon-clip">
            <circle cx="50" cy="50" r="40" />
          </clipPath>
          <g clipPath="url(#error-horizon-clip)">
            <g className={HORIZON}>
              <rect x="-50" y="-50" width="200" height="100" className="fill-secondary-300" />
              <rect x="-50" y="50" width="200" height="100" className="fill-primary-800" />
              <path d="M-50 50h200" className="stroke-neutral-50" strokeWidth="2" />
            </g>
          </g>
          <path
            d="M26 50h14l10 8 10-8h14"
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-accent"
          />
        </>
      )}
      <circle cx="50" cy="50" r="43" strokeWidth="12" className={RING} />
    </svg>
  );
}
