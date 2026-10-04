"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { useMessages } from "@/lib/use-messages";
import ScrollReveal from "./ScrollReveal";

const SVG_NS = "http://www.w3.org/2000/svg";
const TRAIL_MS = 900;
const STEP_PX = 6;
const FOLLOW = 0.3;
const MAX_POINTS = 320;

const TONES = {
  base: {
    heading: "text-primary-950 dark:text-white",
    body: "text-primary-800 dark:text-neutral-300",
    primary: "bg-accent-300 hover:bg-accent-200 text-neutral-950",
    secondary:
      "bg-primary-950/5 hover:bg-primary-950/10 text-primary-950 border-primary-950/20 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-white/20",
    note: "text-primary-700 dark:text-neutral-400",
  },
  reveal: {
    heading: "text-white dark:text-primary-950",
    body: "text-neutral-300 dark:text-primary-950/80",
    primary: "bg-neutral-50 text-primary-950 dark:bg-primary-950 dark:text-accent-300",
    secondary:
      "bg-white/10 text-white border-white/20 dark:bg-primary-950/10 dark:text-primary-950 dark:border-primary-950/25",
    note: "text-neutral-400 dark:text-primary-950/70",
  },
};

function CtaContent({ tone }: { tone: keyof typeof TONES }) {
  const t = useMessages("landing");
  const classes = TONES[tone];

  return (
    <ScrollReveal className="mx-auto max-w-4xl text-center space-y-6">
      <h2 className={`text-display font-heading font-extrabold text-3xl text-balance sm:text-5xl leading-tight ${classes.heading}`}>
        {t.cta.heading}
      </h2>

      <p className={`mx-auto max-w-2xl text-body text-pretty sm:text-h3 font-normal leading-relaxed ${classes.body}`}>
        {t.cta.description}
      </p>

      <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
        <a
          href="/plan"
          className={`group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full font-bold px-8 py-4 text-label-lg transition-[background-color,scale] duration-150 ease-out active:scale-[0.98] ${classes.primary}`}
        >
          <span>{t.cta.ctaPrimary}</span>
          <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
        </a>

        <a
          href="#pwa-info"
          className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full font-semibold px-8 py-4 text-label-lg border transition-[background-color,scale] duration-150 ease-out active:scale-[0.98] ${classes.secondary}`}
        >
          <span>{t.cta.ctaSecondary}</span>
        </a>
      </div>

      <p className={`text-caption font-medium pt-2 ${classes.note}`}>{t.cta.note}</p>
    </ScrollReveal>
  );
}

export default function CtaSection() {
  const clipId = `cta-brush-${useId().replace(/:/g, "")}`;
  const sectionRef = useRef<HTMLElement>(null);
  const clipRef = useRef<SVGClipPathElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const clip = clipRef.current;
    if (!section || !clip) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    type Point = { x: number; y: number; t: number };
    let points: Point[] = [];
    let target: { x: number; y: number } | null = null;
    let current: { x: number; y: number } | null = null;
    let radius = 64;
    let frame = 0;

    const render = (now: number) => {
      while (clip.childElementCount < points.length) {
        clip.appendChild(document.createElementNS(SVG_NS, "circle"));
      }
      const circles = clip.children;
      for (let i = 0; i < circles.length; i++) {
        const circle = circles[i];
        const point = points[i];
        if (!point) {
          circle.setAttribute("r", "0");
          continue;
        }
        const life = Math.max(1 - (now - point.t) / TRAIL_MS, 0);
        circle.setAttribute("cx", point.x.toFixed(1));
        circle.setAttribute("cy", point.y.toFixed(1));
        circle.setAttribute("r", (radius * Math.sqrt(life)).toFixed(1));
      }
    };

    const tick = (now: number) => {
      frame = 0;
      if (target && current) {
        const next = {
          x: current.x + (target.x - current.x) * FOLLOW,
          y: current.y + (target.y - current.y) * FOLLOW,
        };
        const distance = Math.hypot(next.x - current.x, next.y - current.y);
        if (distance > 0.5) {
          const steps = Math.ceil(distance / STEP_PX);
          for (let i = 1; i <= steps; i++) {
            points.push({
              x: current.x + ((next.x - current.x) * i) / steps,
              y: current.y + ((next.y - current.y) * i) / steps,
              t: now,
            });
          }
          current = next;
        }
      }
      points = points.filter((point) => now - point.t < TRAIL_MS).slice(-MAX_POINTS);
      render(now);
      if (points.length > 0 || (target && current && Math.hypot(target.x - current.x, target.y - current.y) > 0.5)) {
        frame = requestAnimationFrame(tick);
      }
    };

    const locate = (event: PointerEvent) => {
      const rect = section.getBoundingClientRect();
      radius = Math.min(Math.max(rect.width * 0.05, 40), 88);
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const onMove = (event: PointerEvent) => {
      target = locate(event);
      if (!current) current = { ...target };
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onStart = (event: PointerEvent) => {
      target = locate(event);
      current = { ...target };
    };

    const onEnd = () => {
      target = null;
      current = null;
    };

    section.addEventListener("pointerenter", onStart);
    section.addEventListener("pointerdown", onStart);
    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onEnd);
    section.addEventListener("pointercancel", onEnd);
    return () => {
      cancelAnimationFrame(frame);
      section.removeEventListener("pointerenter", onStart);
      section.removeEventListener("pointerdown", onStart);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onEnd);
      section.removeEventListener("pointercancel", onEnd);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative isolate z-0 w-full touch-pan-y overflow-hidden bg-[linear-gradient(to_bottom,var(--cta)_calc(100%_-_8rem),var(--background))] px-4 py-16 motion-safe:sticky motion-safe:bottom-0 sm:px-6 sm:py-28 md:px-12 lg:px-20"
    >
      <svg aria-hidden="true" className="absolute size-0">
        <defs>
          <clipPath id={clipId} ref={clipRef} clipPathUnits="userSpaceOnUse" />
        </defs>
      </svg>

      {/* Background ambient lighting */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 -right-40 size-96 -translate-y-1/2 rounded-full bg-accent-300/10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 size-96 -translate-y-1/2 rounded-full bg-secondary-400/10 blur-3xl" />
      </div>

      <CtaContent tone="base" />

      <div
        aria-hidden="true"
        inert
        className="pointer-events-none absolute inset-0 bg-[#052b3b] px-4 py-16 dark:bg-accent-300 select-none sm:px-6 sm:py-28 md:px-12 lg:px-20"
        style={{ clipPath: `url(#${clipId})` }}
      >
        <CtaContent tone="reveal" />
      </div>
    </section>
  );
}
