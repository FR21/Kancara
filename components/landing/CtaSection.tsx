"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { CTA_SHAPE } from "@/components/landing/styles";
import { useMessages } from "@/lib/use-messages";
import ScrollReveal from "./ScrollReveal";

const SVG_NS = "http://www.w3.org/2000/svg";
const TRAIL_MS = 900;
const STEP_PX = 6;
const FOLLOW = 0.3;
const MAX_POINTS = 320;
// The two links are drawn twice, once per tone, so they share everything but their colours.
const CTA_BUTTON = `${CTA_SHAPE} w-full sm:w-auto`;

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

/** The words of a closing section. The note under the buttons is left out where a page has none. */
type ClosingCopy = { heading: string; description: string; primary: string; secondary: string; note?: string };

type CtaContentProps = { tone: keyof typeof TONES; copy: ClosingCopy; secondaryHref: string };

function CtaContent({ tone, copy, secondaryHref }: CtaContentProps) {
  const classes = TONES[tone];

  return (
    <ScrollReveal className="mx-auto max-w-4xl text-center">
      <h2 className={`font-heading text-h1 leading-tight font-extrabold text-balance sm:text-5xl ${classes.heading}`}>
        {copy.heading}
      </h2>

      <p className={`mx-auto mt-4 max-w-2xl text-body leading-relaxed font-normal text-pretty sm:text-h3 ${classes.body}`}>
        {copy.description}
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link href="/plan" className={`${CTA_BUTTON} ${classes.primary}`}>
          {copy.primary}
          <ArrowRight
            className="size-5 transition-[translate] duration-300 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>

        <Link href={secondaryHref} className={`${CTA_BUTTON} border ${classes.secondary}`}>
          {copy.secondary}
        </Link>
      </div>

      {copy.note && <p className={`mt-4 text-caption font-medium ${classes.note}`}>{copy.note}</p>}
    </ScrollReveal>
  );
}

type CtaSectionProps = {
  /** Which page this closes: the words and the second button follow it. */
  page: "home" | "about";
};

// The closing section of the public pages (home and About). On the home page it is painted twice, so a brush that
// follows the pointer reveals the second coat, and it stays pinned under the section above. On About it is plain:
// the page's own colours, fading from the section above into the footer.
export default function CtaSection({ page }: CtaSectionProps) {
  const landing = useMessages("landing").cta;
  const about = useMessages("about").cta;
  const copy: ClosingCopy =
    page === "home"
      ? { heading: landing.heading, description: landing.description, primary: landing.ctaPrimary, secondary: landing.ctaSecondary, note: landing.note }
      : { heading: about.title, description: about.body, primary: about.primary, secondary: about.secondary };
  const secondaryHref = page === "home" ? "/about" : "/#story-steps";
  const brush = page === "home";
  const clipId = `cta-brush-${useId().replace(/:/g, "")}`;
  const sectionRef = useRef<HTMLElement>(null);
  const clipRef = useRef<SVGClipPathElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const clip = clipRef.current;
    if (!brush || !section || !clip) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    type Point = { x: number; y: number; bornAt: number };
    let points: Point[] = [];
    let target: { x: number; y: number } | null = null;
    let current: { x: number; y: number } | null = null;
    let radius = 32;
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
        const life = Math.max(1 - (now - point.bornAt) / TRAIL_MS, 0);
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
              bornAt: now,
            });
          }
          current = next;
        }
      }
      points = points.filter((point) => now - point.bornAt < TRAIL_MS).slice(-MAX_POINTS);
      render(now);
      if (points.length > 0 || (target && current && Math.hypot(target.x - current.x, target.y - current.y) > 0.5)) {
        frame = requestAnimationFrame(tick);
      }
    };

    const locate = (event: PointerEvent) => {
      const rect = section.getBoundingClientRect();
      radius = Math.min(Math.max(rect.width * 0.025, 24), 44);
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
  }, [brush]);

  return (
    <section
      ref={sectionRef}
      className={`relative isolate z-0 w-full touch-pan-y overflow-hidden px-4 py-16 sm:px-6 sm:py-24 md:px-12 lg:px-20 ${
        brush
          ? "bg-[linear-gradient(to_bottom,var(--section-muted),var(--cta)_10rem,var(--cta)_calc(100%_-_8rem),var(--background))] motion-safe:sticky motion-safe:bottom-0"
          : "bg-[linear-gradient(to_bottom,var(--section-muted),var(--background)_10rem)]"
      }`}
    >
      {brush && (
        <>
          <svg aria-hidden="true" className="absolute size-0">
            <defs>
              <clipPath id={clipId} ref={clipRef} clipPathUnits="userSpaceOnUse" />
            </defs>
          </svg>
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-1/2 -right-40 size-96 -translate-y-1/2 rounded-full bg-accent-300/10 blur-3xl" />
            <div className="absolute top-1/2 -left-40 size-96 -translate-y-1/2 rounded-full bg-secondary-400/10 blur-3xl" />
          </div>
        </>
      )}

      <CtaContent tone="base" copy={copy} secondaryHref={secondaryHref} />

      {brush && (
        <div
          aria-hidden="true"
          inert
          className="pointer-events-none absolute inset-0 bg-night px-4 py-16 select-none sm:px-6 sm:py-24 md:px-12 lg:px-20 dark:bg-accent-300"
          style={{ clipPath: `url(#${clipId})` }}
        >
          <CtaContent tone="reveal" copy={copy} secondaryHref={secondaryHref} />
        </div>
      )}
    </section>
  );
}
