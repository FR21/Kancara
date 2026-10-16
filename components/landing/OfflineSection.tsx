"use client";

import {
  ArrowRight,
  BatteryMedium,
  Check,
  CircleCheck,
  MapPin,
  ShieldCheck,
  Tent,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { BADGE, EASE, buttonClass } from "@/components/ui/styles";
import { useMessages } from "@/lib/use-messages";
// The section's opening, played once when it scrolls into view: each part starts hidden a little low and rises into
// place, a beat after the one before. With reduced motion everything is simply there.
const ENTER = `transition-[opacity,translate] duration-700 ${EASE} motion-safe:translate-y-6 motion-safe:opacity-0 motion-safe:group-data-in-view/offline:translate-y-0 motion-safe:group-data-in-view/offline:opacity-100`;
// A line of the headline rises from behind its own lower edge, like a word slid up into a slot.
const LINE_MASK = "-mb-2 block overflow-hidden pb-2";
const LINE = `block transition-[translate] duration-900 ${EASE} motion-safe:translate-y-full motion-safe:group-data-in-view/offline:translate-y-0`;

function delay(milliseconds: number) {
  return { transitionDelay: `${milliseconds}ms` };
}

const MEMBERS = [
  { initial: "J", x: 24, y: 30, tone: "bg-primary-600 text-neutral-50" },
  { initial: "S", x: 76, y: 40, tone: "bg-accent-400 text-neutral-950" },
  { initial: "M", x: 46, y: 70, tone: "bg-secondary-500 text-neutral-950", you: true },
];

const CONTOURS = [
  "M8 22C26 6 58 8 74 20S98 54 82 70S42 88 22 72S-6 38 8 22Z",
  "M20 28C34 16 56 18 68 28S84 52 72 62S44 74 30 64S8 40 20 28Z",
  "M32 34C42 28 54 30 60 36S66 50 58 55S42 60 36 54S26 40 32 34Z",
];

const TRAIL = "M6 96C18 86 30 84 40 78S58 62 66 52S82 30 90 18";

const FLOAT_CARD =
  "absolute z-20 flex items-center gap-3 surface-compact rounded-surface border p-surface shadow-xl shadow-neutral-950/15 transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:translate-y-3 motion-safe:opacity-0 motion-safe:group-data-in-view/phone:translate-y-0 motion-safe:group-data-in-view/phone:opacity-100";

function Phone() {
  const t = useMessages("landing").offline;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => element.toggleAttribute("data-in-view", entry.isIntersecting),
      { threshold: 0.3 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="group/phone relative w-75 max-w-full">
      <div className={`${FLOAT_CARD} -top-16 left-0 border-border bg-surface delay-200 sm:top-28 sm:-left-20`}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
          <WifiOff className="size-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-label text-text">{t.offlineCard.title}</span>
          <span className="block text-caption text-text-muted">{t.offlineCard.body}</span>
        </span>
      </div>

      <div className={`${FLOAT_CARD} -right-4 -bottom-6 border-accent-400 bg-accent text-on-accent delay-400 sm:-right-16`}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-950/10">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-label">{t.calmCard.title}</span>
          <span className="block text-caption text-neutral-950/75">{t.calmCard.body}</span>
        </span>
      </div>

      <span aria-hidden="true" className="absolute top-28 -left-1 h-8 w-2 rounded-full bg-neutral-700" />
      <span aria-hidden="true" className="absolute top-40 -left-1 h-12 w-2 rounded-full bg-neutral-700" />
      <span aria-hidden="true" className="absolute top-56 -left-1 h-12 w-2 rounded-full bg-neutral-700" />
      <span aria-hidden="true" className="absolute top-40 -right-1 h-20 w-2 rounded-full bg-neutral-700" />

      {/* The case is a compact surface, so the screen inside its 12px bezel takes the 8px inner corner. */}
      <div
        role="img"
        aria-label={t.phone.label}
        className="relative surface-compact rounded-surface bg-neutral-900 p-surface shadow-2xl ring-1 shadow-neutral-950/40 ring-neutral-700"
      >
        <div
          aria-hidden="true"
          className="relative flex aspect-[9/19] flex-col overflow-clip rounded-lg bg-background"
        >
          <span className="absolute top-3 left-1/2 h-6 w-24 -translate-x-1/2 rounded-full bg-neutral-950" />

          <div className="flex h-11 shrink-0 items-center justify-between px-6 pt-1 text-caption font-semibold text-text">
            <span className="tabular-nums">09:41</span>
            <span className="flex items-center gap-1 text-text-muted">
              <svg viewBox="0 0 16 12" className="h-3 w-4" fill="currentColor">
                <rect x="0" y="8" width="3" height="4" rx="1" opacity="0.35" />
                <rect x="4.3" y="5.5" width="3" height="6.5" rx="1" opacity="0.35" />
                <rect x="8.6" y="3" width="3" height="9" rx="1" opacity="0.35" />
                <rect x="13" y="0" width="3" height="12" rx="1" opacity="0.35" />
              </svg>
              <WifiOff className="size-4" />
              <BatteryMedium className="size-4 text-text" />
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-3 px-4 pt-2 pb-6">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-caption text-text-muted">
                  <span className="size-2 rounded-full bg-success" />
                  {t.phone.app}
                </p>
                <p className="mt-1 flex items-center gap-1 font-heading text-label text-text">
                  <MapPin className="size-4 shrink-0 text-primary" />
                  {t.phone.destination}
                </p>
              </div>
              <span className={`${BADGE} shrink-0 bg-success-subtle text-on-success-subtle`}>
                <Check className="size-3" strokeWidth={3} />
                {t.phone.saved}
              </span>
            </div>

            {/* Inside the screen's small corner the map runs edge to edge, square, the way a map app draws it. */}
            <div className="relative -mx-4 min-h-0 flex-1 overflow-clip border-y border-border bg-surface">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
                {CONTOURS.map((d) => (
                  <path
                    key={d}
                    d={d}
                    fill="none"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                    className="stroke-border"
                  />
                ))}
                <path
                  d={TRAIL}
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="6 5"
                  vectorEffect="non-scaling-stroke"
                  className="stroke-primary/35"
                />
                {MEMBERS.map((from, index) => {
                  const to = MEMBERS[(index + 1) % MEMBERS.length];
                  return (
                    <line
                      key={from.initial}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="0.5 9"
                      vectorEffect="non-scaling-stroke"
                      className="stroke-success"
                    />
                  );
                })}
              </svg>

              <span className="absolute top-[18%] left-[90%] flex size-7 -translate-1/2 items-center justify-center rounded-full bg-primary text-on-primary shadow-md">
                <Tent className="size-4" />
              </span>

              {MEMBERS.map((member) => (
                <span
                  key={member.initial}
                  style={{ left: `${member.x}%`, top: `${member.y}%` }}
                  className="absolute -translate-1/2"
                >
                  {member.you && (
                    <>
                      <span className="absolute inset-0 animate-ping rounded-full bg-secondary-500/40 [animation-duration:2.4s] [animation-play-state:paused] group-data-in-view/phone:[animation-play-state:running] motion-reduce:hidden" />
                      <span className="absolute inset-0 animate-ping rounded-full bg-secondary-500/30 [animation-delay:1.2s] [animation-duration:2.4s] [animation-play-state:paused] group-data-in-view/phone:[animation-play-state:running] motion-reduce:hidden" />
                    </>
                  )}
                  <span
                    className={`relative flex size-9 items-center justify-center rounded-full text-caption font-bold shadow-md ring-2 ring-surface ${member.tone}`}
                  >
                    {member.initial}
                  </span>
                </span>
              ))}

              <span className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1 text-caption font-semibold text-success backdrop-blur-sm">
                <span className="relative flex size-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-success [animation-play-state:paused] group-data-in-view/phone:[animation-play-state:running] motion-reduce:hidden" />
                  <span className="relative size-2 rounded-full bg-success" />
                </span>
                {t.phone.network}
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-full border border-border bg-surface p-1 pr-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success">
                <CircleCheck className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-label text-text">{t.statusPill}</span>
                <span className="mt-1 block text-caption text-text-muted">{t.subStatus}</span>
              </span>
            </div>

            <span className="flex h-11 shrink-0 items-center justify-center rounded-full bg-primary text-label text-on-primary shadow-md shadow-primary/20">
              {t.phone.checkIn}
            </span>
          </div>

          <span className="absolute bottom-2 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-text/25" />
        </div>
      </div>
    </div>
  );
}

export default function OfflineSection() {
  const t = useMessages("landing");
  const sectionRef = useRef<HTMLElement>(null);

  // Played once: the section stays in its final state after the first time it is seen.
  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        element.setAttribute("data-in-view", "");
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="pwa-info"
      className="group/offline relative z-10 w-full overflow-hidden bg-[linear-gradient(to_bottom,var(--background),var(--section-muted)_10rem)] px-4 py-16 shadow-2xl shadow-neutral-950/15 sm:px-6 sm:py-24 md:px-12 lg:px-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          <div className="flex-1 text-left">
            <h2 className="font-heading text-4xl leading-tight font-extrabold text-balance text-text sm:text-5xl">
              <span className={LINE_MASK}>
                <span className={LINE}>{t.offline.titlePart1}</span>
              </span>
              <span className={LINE_MASK}>
                <span className={`${LINE} text-success`} style={delay(140)}>
                  {t.offline.titlePart2}
                </span>
              </span>
            </h2>

            <p className={`mt-4 max-w-lg text-body text-pretty text-text-muted sm:text-lead ${ENTER}`} style={delay(320)}>
              {t.offline.description}
            </p>

            <ul className="mt-8 space-y-3">
              {t.offline.points.map((point, index) => (
                <li key={point} className={`flex items-center gap-3 text-body-sm font-bold text-text ${ENTER}`} style={delay(460 + index * 110)}>
                  <CircleCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>

            <div className={`mt-8 ${ENTER}`} style={delay(460 + t.offline.points.length * 110)}>
              <Link href="/plan" className={`group ${buttonClass("primary", "large")} shadow-md`}>
                {t.offline.cta}
                <ArrowRight
                  className="size-4 transition-[translate] duration-200 ease-out group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>

          <div className={`flex w-full flex-1 justify-center pt-20 pb-8 sm:py-6 ${ENTER}`} style={delay(200)}>
            <Phone />
          </div>
        </div>
      </div>
    </section>
  );
}
