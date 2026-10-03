"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Play,
  CheckCircle2,
  Compass,
  MapPin,
  ShieldCheck,
  Heart,
  Sparkles,
  Plane,
  Camera,
  Globe,
  Calendar,
} from "lucide-react";
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
    <section className="relative w-full h-[150vh]">

      {/* 1: Sticky Background */}
      <div className="sticky top-0 w-full h-screen overflow-hidden pointer-events-none z-0">
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
        className="pointer-events-none absolute inset-x-0 -bottom-px z-10 h-[clamp(6rem,18vh,11rem)] bg-[linear-gradient(to_bottom,transparent,color-mix(in_srgb,var(--section-muted)_6%,transparent)_22%,color-mix(in_srgb,var(--section-muted)_24%,transparent)_42%,color-mix(in_srgb,var(--section-muted)_56%,transparent)_62%,color-mix(in_srgb,var(--section-muted)_86%,transparent)_80%,var(--section-muted)_92%)]"
      />

      {/* 3: Text */}
      <div className="sticky top-0 w-full h-screen z-20 pointer-events-none -mt-[100vh]">

        {/* TEXT CONTENT */}
        <div
          className="absolute inset-0 pointer-events-auto flex flex-col justify-center items-center"
          style={{ opacity: textOpacity, visibility: textOpacity === 0 ? "hidden" : undefined }}
        >
          <div
            className="mx-auto w-full max-w-4xl text-center px-4 sm:px-6 mt-16 sm:mt-0 translate-y-0 sm:translate-y-[22px]"
          >
            <div>
              <span className="text-caption font-extrabold tracking-widest text-accent-300 uppercase drop-shadow-sm">
                {t.hero.tagline}
              </span>
            </div>

            <h1 className="mt-2 sm:mt-4 text-display font-heading font-extrabold leading-tight tracking-tight text-white text-4xl sm:text-5xl lg:text-6xl drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
              {t.hero.headlinePart1} <br />
              <span className="relative inline-block text-accent-300">
                {t.hero.headlinePart2}
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-accent-300"
                  viewBox="0 0 200 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 10C50 3 150 3 198 10"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            <p className="mt-4 sm:mt-6 mx-auto text-body sm:text-body-lg lg:text-h3 font-semibold text-white leading-relaxed max-w-2xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
              {t.hero.description}
            </p>

            <div className="pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <a
                href="/plan"
                className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-accent-300 hover:bg-accent-200 text-neutral-950 font-bold px-8 py-3.5 sm:py-4 text-label-lg transition-all duration-300 shadow-xl active:scale-[0.98]"
              >
                <span>{t.hero.ctaPrimary}</span>
                <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
              </a>

              <a
                href="#story-steps"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-black/40 hover:bg-black/60 text-white font-bold px-8 py-3.5 sm:py-4 text-label-lg border border-white/30 backdrop-blur-md transition-all duration-300 active:scale-[0.98]"
              >
                <Play className="size-4 fill-white text-white" />
                <span>{t.hero.ctaSecondary}</span>
              </a>
            </div>

            <div className="pt-5 mt-5 sm:pt-8 sm:mt-8 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4 max-w-2xl mx-auto drop-shadow-md">
              <div className="flex items-center gap-2 text-caption text-white font-bold text-center">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                <span>{t.hero.meta}</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="size-8 rounded-full bg-primary-600 border-2 border-neutral-900 flex items-center justify-center text-caption font-bold text-white">JL</div>
                  <div className="size-8 rounded-full bg-accent-400 border-2 border-neutral-900 flex items-center justify-center text-caption font-bold text-neutral-950">MA</div>
                  <div className="size-8 rounded-full bg-secondary-500 border-2 border-neutral-900 flex items-center justify-center text-caption font-bold text-neutral-950">SK</div>
                  <div className="size-8 rounded-full bg-neutral-700 border-2 border-neutral-900 flex items-center justify-center text-caption font-bold text-white">+</div>
                </div>
                <span className="text-caption font-bold text-white text-center sm:text-left">
                  {t.hero.statSummary}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
