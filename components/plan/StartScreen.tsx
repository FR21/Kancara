"use client";

import {
  ArrowRight,
  MapPin,
  Sparkles,
  Ticket,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import type { Messages } from "@/lib/messages";
import { TEXT_LINK, buttonClass, EASE } from "@/components/ui/styles";
import Image from "next/image";
import { FORWARD_ARROW } from "./DeckFooter";
import { useMediaQuery } from "@/lib/use-media-query";

type StartScreenProps = {
  text: Messages["plan"];
  onStartManual: () => void;
  /** A quiet second way in under the start button: the plan saved on this device, when there is one. */
  resume?: ReactNode;
};

const STOPS = ["trip", "crew", "budget", "extras", "pass"] as const;
type StopKey = (typeof STOPS)[number];

const STOP_ICONS: Record<StopKey, LucideIcon> = {
  trip: MapPin,
  crew: Users,
  budget: Wallet,
  extras: Sparkles,
  pass: Ticket,
};

const CYCLE_MS = 3200;

// The opening of a plan: a clean side-by-side transit route that connects stations like a train line.
// Free of boxes and emojis, with pure color progression along the track up to the active stop.
export default function StartScreen({ text, onStartManual, resume }: StartScreenProps) {
  const copy = text.start;
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [activeStop, setActiveStop] = useState<number>(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Auto-advance station highlight unless user is touching/hovering or prefers reduced motion
  useEffect(() => {
    if (reduceMotion || isInteracting) return;
    const root = rootRef.current;
    if (!root) return;

    let timer: ReturnType<typeof setInterval> | undefined;
    let inView = false;

    const run = () => {
      clearInterval(timer);
      timer = undefined;
      if (!inView || document.visibilityState !== "visible") return;
      timer = setInterval(() => {
        setActiveStop((curr) => (curr + 1) % STOPS.length);
      }, CYCLE_MS);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        run();
      },
      { threshold: 0.2 },
    );
    observer.observe(root);
    document.addEventListener("visibilitychange", run);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", run);
      clearInterval(timer);
    };
  }, [reduceMotion, isInteracting]);

  return (
    <div className="grid w-full items-start gap-8 motion-safe:animate-message-in lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-12 xl:gap-16">
      {/* Left Column: Captain speech cloud + mascot, Heading, Lead, Action buttons */}
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
        {/* Captain Mascot with Speech Cloud Bubble beside him (nyamping) */}
        <div className="mb-6 flex w-full flex-row items-center justify-center gap-3.5 sm:gap-5">
          {/* Captain Penguin Mascot Illustration (Enlarged, no artificial shadow) */}
          <div className="group/captain relative shrink-0">
            <Image
              src="/images/logo/kancara_mascot_captain_logo.webp"
              alt="Captain mascot"
              width={500}
              height={500}
              priority
              className="size-24 object-contain transition-transform duration-300 ease-spring group-hover/captain:scale-105 group-hover/captain:-rotate-3 sm:size-28 lg:size-32"
            />
          </div>

          {/* Cloud / Speech bubble pointing toward Captain */}
          <div className="relative max-w-[240px] rounded-2xl border border-primary/25 bg-surface px-3.5 py-2.5 shadow-xs backdrop-blur-xs transition-transform duration-300 hover:scale-[1.02] sm:max-w-[280px] sm:px-4 sm:py-3">
            <p className="text-left text-caption font-medium leading-snug text-text sm:text-body-sm">
              {copy.captain}
            </p>
            {/* Speech bubble tail pointing left toward Captain */}
            <span
              aria-hidden="true"
              className="absolute top-1/2 -left-1.5 size-3 -translate-y-1/2 rotate-45 border-b border-l border-primary/25 bg-surface"
            />
          </div>
        </div>

        <h1 tabIndex={-1} className="font-heading text-h2 text-balance text-text outline-none sm:text-h1">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-xl text-body text-pretty text-text-muted">{copy.lead}</p>

        <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
          <button type="button" onClick={onStartManual} className={`group ${buttonClass("primary", "large")}`}>
            {copy.form}
            <ArrowRight className={FORWARD_ARROW} aria-hidden="true" />
          </button>
          <Link href="/profile/saved-members" className={`${TEXT_LINK} justify-center`}>
            <Users className="size-4" aria-hidden="true" />
            {copy.savedProfiles}
          </Link>
        </div>
        {resume && <div className="mt-4 motion-safe:animate-message-in motion-safe:[animation-delay:150ms]">{resume}</div>}
      </div>

      {/* Right Column: Transit Map Timeline (Clean color flow, connected track, no individual boxes) */}
      <div
        ref={rootRef}
        onMouseEnter={() => setIsInteracting(true)}
        onMouseLeave={() => setIsInteracting(false)}
        onTouchStart={() => setIsInteracting(true)}
        onTouchEnd={() => setIsInteracting(false)}
        className="relative rounded-surface border border-border bg-surface p-4 shadow-sm sm:p-5"
      >
        {/* Track header */}
        <div className="mb-3.5 flex items-center justify-between border-b border-border pb-2.5">
          <span className="flex items-center gap-2 text-caption font-bold tracking-wider text-text-muted uppercase">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-75 motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-primary" />
            </span>
            {copy.routeLabel}
          </span>
          <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-caption font-semibold text-primary tabular-nums">
            {activeStop + 1} / {STOPS.length}
          </span>
        </div>

        {/* Stations List: Track line connects seamlessly from start to active station */}
        <ol aria-label={copy.routeLabel} className="relative space-y-1">
          {STOPS.map((stop, index) => {
            const isActive = index === activeStop;
            const isPassed = index < activeStop;
            const isLast = index === STOPS.length - 1;
            const Icon = STOP_ICONS[stop];

            return (
              <li key={stop} className="relative">
                {/* Connecting track segment: runs center-to-center behind nodes for seamless unity */}
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className={`absolute top-[1.75rem] bottom-[-1.75rem] left-[1.625rem] w-1 -translate-x-1/2 transition-colors duration-400 ease-out ${
                      isPassed ? "bg-primary" : "bg-border-strong/40"
                    }`}
                  />
                )}

                <button
                  type="button"
                  onClick={() => setActiveStop(index)}
                  aria-current={isActive ? "step" : undefined}
                  className="group/station flex min-h-12 w-full cursor-pointer items-start gap-3.5 rounded-lg p-2 text-left transition-colors duration-150 hover:bg-surface-muted/30 active:scale-[0.99]"
                >
                  {/* Station Node (Metro/Train stop circle) */}
                  <span className="relative flex shrink-0 items-center justify-center pt-0.5">
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 -m-1 rounded-full bg-primary/25 motion-safe:animate-ping motion-reduce:hidden"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${EASE} ${
                        isActive
                          ? "scale-105 border-primary bg-primary text-on-primary ring-4 ring-primary/20 shadow-xs"
                          : isPassed
                            ? "border-primary bg-primary text-on-primary shadow-xs"
                            : "border-border-strong bg-background text-text-muted group-hover/station:border-text-muted group-hover/station:text-text"
                      }`}
                    >
                      <Icon className={`size-4 shrink-0 transition-transform duration-300 ${EASE} ${isActive ? "scale-110" : "scale-100"}`} aria-hidden="true" />
                    </span>
                  </span>

                  {/* Station Content (Pure color contrast, no section boxes) */}
                  <span className="min-w-0 flex-1 pt-1">
                    <span
                      className={`block text-body-sm transition-colors duration-200 ${
                        isActive
                          ? "font-extrabold text-primary"
                          : isPassed
                            ? "font-bold text-text"
                            : "font-semibold text-text-muted"
                      }`}
                    >
                      {copy.route[stop].name}
                    </span>
                    <span
                      className={`mt-0.5 block line-clamp-2 text-justify text-caption leading-snug transition-colors duration-200 [text-align-last:left] sm:text-body-sm ${
                        isActive
                          ? "text-text font-normal"
                          : isPassed
                            ? "text-text-muted"
                            : "text-text-muted/60"
                      }`}
                    >
                      {copy.route[stop].asks}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
