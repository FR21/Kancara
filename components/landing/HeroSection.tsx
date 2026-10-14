"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ACCENT_CTA, QUIET_CTA } from "@/components/landing/styles";
import type { Messages } from "@/lib/messages";
import { useMediaQuery } from "@/lib/use-media-query";
import { useMessages } from "@/lib/use-messages";

type HeroCopyProps = {
  text: Messages["landing"]["hero"];
};

// The hero stays pinned for the first half screen of scrolling. Over that stretch the trees, which start low
// enough to leave the headline and its buttons in open sky, rise to their full height while the copy sinks to
// meet them. Both distances are in svh, the unit the hero itself is sized in.
const TREE_DROP_SVH = 20;
const COPY_SINK_SVH = 25;
const COPY_FADE_PX = 600;
// As the hero leaves the screen its layers part: the trees hang back while the two waves rise, the far one
// much further than the near one. The trees' distance is in svh, the waves' in percent of their own height.
// The near wave closes the hero's lower edge, so it never starts lower than its lowest crest allows.
const TREE_LAG_SVH = 20;
const FAR_WAVE_FROM = 30;
const FAR_WAVE_TO = -20;
const NEAR_WAVE_FROM = 16;

function HeroCopy({ text }: HeroCopyProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <div className="mx-auto w-full max-w-3xl px-4 pt-16 text-center sm:px-6">
        <h1 className="font-heading text-5xl leading-[1.05] font-extrabold tracking-tight text-balance text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] motion-safe:animate-rise-in sm:text-6xl lg:text-7xl">
          {text.headlinePart1} <br />
          <span className="text-accent-300">
            {text.headlinePart2}{" "}
            <span className="whitespace-nowrap">
              <span className="relative inline-block">
                {text.headlineUnderlined}
                <svg
                  aria-hidden="true"
                  className="absolute -bottom-2 left-0 h-3 w-full"
                  viewBox="0 0 200 12"
                  preserveAspectRatio="none"
                  fill="none"
                >
                  <path
                    d="M2 10C50 3 150 3 198 10"
                    pathLength={1}
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="1"
                    className="motion-safe:animate-draw motion-safe:[animation-delay:600ms]"
                  />
                </svg>
              </span>
              {text.headlineEnd}
            </span>
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-body font-medium text-pretty text-white/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] motion-safe:animate-rise-in motion-safe:[animation-delay:100ms] sm:mt-8 sm:text-h3">
          {text.description}
        </p>

        <div className="pointer-events-auto mt-8 flex flex-col items-center justify-center gap-2 motion-safe:animate-rise-in motion-safe:[animation-delay:200ms] sm:mt-10 sm:flex-row sm:gap-6">
          <Link
            href="/plan"
            className={ACCENT_CTA}
          >
            {text.ctaPrimary}
            <ArrowRight
              aria-hidden="true"
              className="size-5 transition-[translate] duration-300 group-hover:translate-x-1"
            />
          </Link>

          <a
            href="#story-steps"
            className={`${QUIET_CTA} text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]`}
          >
            {text.ctaSecondary}
            <ArrowDown
              aria-hidden="true"
              className="size-4 transition-[translate] duration-300 group-hover:translate-y-1"
            />
          </a>
        </div>

        <p className="mt-4 text-caption font-medium text-white/80 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] motion-safe:animate-rise-in motion-safe:[animation-delay:300ms]">
          {text.note}
        </p>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const t = useMessages("landing");
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [scroll, setScroll] = useState({ y: 0, pinned: 0, leaving: 0 });

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      // `pinned` runs from 0 to 1 while the hero is pinned, then stays at 1. `leaving` picks up where it ends and
      // runs from 0 to 1 over the next screen of scrolling, while the hero's lower edge crosses the screen.
      const half = window.innerHeight / 2;
      setScroll({
        y: window.scrollY,
        pinned: Math.min(window.scrollY / half, 1),
        leaving: Math.min(Math.max((window.scrollY - half) / window.innerHeight, 0), 1),
      });
    };
    // One update per painted frame, however many scroll events a fast flick fires.
    const handleScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // With reduced motion nothing travels: the trees stay low, the waves stay at rest, and the copy only fades.
  const travelled = reduceMotion ? 0 : scroll.pinned;
  const treeLag = reduceMotion ? 0 : TREE_LAG_SVH * scroll.leaving;
  const farWave = reduceMotion ? 0 : FAR_WAVE_FROM + (FAR_WAVE_TO - FAR_WAVE_FROM) * scroll.leaving;
  const nearWave = reduceMotion ? 0 : NEAR_WAVE_FROM * (1 - scroll.leaving);
  const copyOpacity = Math.max(1 - scroll.y / COPY_FADE_PX, 0);

  return (
    // Nothing of the hero is drawn past its own edges, so the copy cannot show through over the section below.
    // The bottom is let out by a pixel for the waves, which overlap the next section by that much to hide the seam.
    <section className="relative h-[150svh] w-full [clip-path:inset(0_0_-1px_0)]">
      <div className="pointer-events-none sticky top-0 z-0 h-svh w-full overflow-hidden">
        <Image
          src="/images/hero/Sky.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-top opacity-90"
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/50 via-black/10 to-black/30" />
      </div>

      {/* The trees ignore the pointer, so a button they have risen over can still be pressed. */}
      <div className="pointer-events-none absolute inset-0 z-10 size-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ translate: `0 ${TREE_DROP_SVH * (1 - travelled) + treeLag}svh` }}
        >
          <Image
            src="/images/hero/Treeline.webp"
            alt=""
            fill
            priority
            // The picture fills a box one and a half screens tall, so on a phone it is drawn far wider than the screen.
            sizes="max(100vw, 200vh)"
            className="translate-x-[-2%] scale-[1.05] object-cover object-[60%_95%] brightness-70"
          />
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-px z-10 h-[clamp(4rem,9vw,8.5rem)] overflow-hidden"
      >
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full fill-section-muted opacity-50 dark:fill-primary-900 dark:opacity-70"
          style={{ translate: `0 ${farWave}%` }}
        >
          <path d="M0 72C150 44 260 36 380 38C520 40 600 60 760 60C900 60 1020 34 1160 30C1280 27 1380 44 1440 56V120H0Z" />
        </svg>
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full fill-section-muted"
          style={{ translate: `0 ${nearWave}%` }}
        >
          <path d="M0 96C240 54 470 72 720 84S1200 46 1440 80V120H0Z" />
        </svg>
      </div>

      <div
        className="pointer-events-none sticky top-0 z-5 -mt-[100svh] h-svh w-full"
        style={{
          opacity: copyOpacity,
          visibility: copyOpacity === 0 ? "hidden" : undefined,
          translate: `0 ${COPY_SINK_SVH * travelled}svh`,
        }}
      >
        <HeroCopy text={t.hero} />
      </div>
    </section>
  );
}
