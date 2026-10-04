"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { useMessages } from "@/lib/use-messages";

export default function HeroSection() {
  const t = useMessages("landing");
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fade out text softly so it transitions well when the next section arrives
  const textOpacity = Math.max(1 - scrollY / 600, 0);

  return (
    <section className="relative w-full h-[150svh]">

      {/* 1: Sticky Background */}
      <div className="sticky top-0 w-full h-svh overflow-hidden pointer-events-none z-0">
        <Image
          src="/images/hero/Sky.webp"
          alt="Sky Background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-top opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/30" />
      </div>

      {/* 2: Scrolling Overlay */}
      <div className="absolute inset-0 w-full h-full z-10 overflow-hidden pointer-events-none">
        <Image
          src="/images/hero/Grass.webp"
          alt="Grass Overlay"
          fill
          priority
          sizes="100vw"
          className="object-cover scale-[1.05] -translate-x-[2%] brightness-70"
          style={{
            objectPosition: "60% 95%"
          }}
        />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-px z-10 h-[clamp(4rem,9vw,8.5rem)] overflow-hidden"
      >
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="parallax-y absolute inset-0 size-full fill-section-muted opacity-50 [--parallax-from:8%] [--parallax-to:-8%] dark:fill-primary-900 dark:opacity-70"
        >
          <path d="M0 72C150 44 260 36 380 38C520 40 600 60 760 60C900 60 1020 34 1160 30C1280 27 1380 44 1440 56V120H0Z" />
        </svg>
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full fill-section-muted"
        >
          <path d="M0 96C240 54 470 72 720 84S1200 46 1440 80V120H0Z" />
        </svg>
      </div>

      {/* 3: Text */}
      <div className="sticky top-0 w-full h-svh z-20 pointer-events-none -mt-[100svh]">

        {/* TEXT CONTENT */}
        <div
          className="absolute inset-0 pointer-events-auto flex flex-col justify-center items-center"
          style={{ opacity: textOpacity, visibility: textOpacity === 0 ? "hidden" : undefined }}
        >
          <div className="mx-auto w-full max-w-3xl px-4 pt-16 text-center sm:px-6">
            <h1 className="font-heading text-5xl leading-[1.05] font-extrabold tracking-tight text-balance text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] motion-safe:animate-rise-in sm:text-6xl lg:text-7xl">
              {t.hero.headlinePart1} <br />
              <span className="relative inline-block text-accent-300">
                {t.hero.headlinePart2}
                <svg
                  aria-hidden="true"
                  className="absolute -bottom-2 left-0 h-3 w-full text-accent-300"
                  viewBox="0 0 200 12"
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
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-body font-medium text-pretty text-white/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] motion-safe:animate-rise-in motion-safe:[animation-delay:100ms] sm:mt-8 sm:text-h3">
              {t.hero.description}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-2 motion-safe:animate-rise-in motion-safe:[animation-delay:200ms] sm:mt-10 sm:flex-row sm:gap-6">
              <a
                href="/plan"
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-accent-300 px-8 text-label-lg font-bold text-neutral-950 shadow-xl transition-[background-color,scale] duration-150 ease-out hover:bg-accent-200 active:scale-[0.97]"
              >
                <span>{t.hero.ctaPrimary}</span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-5 transition-transform duration-300 group-hover:translate-x-1"
                />
              </a>

              <a
                href="#story-steps"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-full px-4 text-label-lg font-bold text-white underline-offset-8 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] hover:underline"
              >
                <span>{t.hero.ctaSecondary}</span>
                <ArrowDown
                  aria-hidden="true"
                  className="size-4 transition-transform duration-300 group-hover:translate-y-1"
                />
              </a>
            </div>

            <p className="mt-6 text-caption font-medium text-white/80 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] motion-safe:animate-rise-in motion-safe:[animation-delay:300ms]">
              {t.hero.note}
            </p>
          </div>
        </div>
      </div>

    </section>
  );
}
