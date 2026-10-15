"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { BADGE, EASE } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import type { AgeGroup } from "@/lib/plan-draft";
import { useMediaQuery } from "@/lib/use-media-query";

type ManifestIllustrationProps = {
  text: Messages["about"]["manifest"];
};

type Mode = "usual" | "kancara";
type PassengerKey = keyof Messages["about"]["manifest"]["passengers"];

// The first passenger is the one whose wishes usually become the plan.
const PASSENGERS: { key: PassengerKey; ageGroup: AgeGroup; loud?: boolean }[] = [
  { key: "bayu", ageGroup: "adult", loud: true },
  { key: "ratna", ageGroup: "elderly" },
  { key: "kirana", ageGroup: "toddler" },
  { key: "dimas", ageGroup: "adult" },
  { key: "sekar", ageGroup: "adult" },
];
/** How long each way of planning stays on screen before the list turns to the other. */
const PHASE_MS = 3200;
const CHIP = `${BADGE} shrink-0 motion-safe:animate-pop-in`;

// The same five people, planned the usual way and then with every need written down first, turning from one to
// the other for as long as the list is on screen. It rests while it is off screen or the tab is hidden, and with
// reduced motion it simply shows the Kancara way.
export default function ManifestIllustration({ text }: ManifestIllustrationProps) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [turning, setTurning] = useState<Mode>("usual");
  const rootRef = useRef<HTMLDivElement>(null);
  const mode: Mode = reduceMotion ? "kancara" : turning;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduceMotion) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let inView = false;
    const run = () => {
      clearInterval(timer);
      timer = undefined;
      if (!inView || document.visibilityState !== "visible") return;
      timer = setInterval(() => setTurning((current) => (current === "usual" ? "kancara" : "usual")), PHASE_MS);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        run();
      },
      { threshold: 0.4 },
    );
    observer.observe(root);
    document.addEventListener("visibilitychange", run);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", run);
      clearInterval(timer);
    };
  }, [reduceMotion]);

  const fair = mode === "kancara";

  // Every avatar is drawn at full size and scaled, so the change never makes the browser lay the list out again.
  const avatarScale = (loud: boolean) => {
    if (fair) return "scale-80";
    return loud ? "scale-100" : "scale-60 opacity-50";
  };

  return (
    <div ref={rootRef} className="rounded-surface border border-border bg-surface p-surface shadow-lg shadow-neutral-950/5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-sans text-label-lg text-text">{text.title}</h3>
        {/* The way of planning on screen now, read out when it changes. */}
        <p
          key={mode}
          aria-live="polite"
          className={`${BADGE} shrink-0 motion-safe:animate-pop-in ${fair ? "bg-primary text-on-primary" : "bg-surface-muted text-text-muted"}`}
        >
          {fair ? text.kancara : text.usual}
        </p>
      </div>

      <ul className="mt-2 divide-y divide-border [&>li:last-child]:pb-0">
        {PASSENGERS.map((passenger, index) => {
          const loud = passenger.loud === true;
          const looked = fair || loud;
          const copy = text.passengers[passenger.key];
          return (
            <li key={passenger.key} className="flex items-center gap-3 py-3">
              <span className="flex size-14 shrink-0 items-center justify-center">
                <MemberAvatar
                  ageGroup={passenger.ageGroup}
                  variant={index}
                  className={`size-14 transition-[scale,opacity] duration-500 ${EASE} motion-reduce:transition-none ${avatarScale(loud)}`}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-label-lg transition-colors duration-500 ${looked ? "text-text" : "text-text-muted"}`}>{copy.name}</span>
                <span className="block text-body-sm text-text-muted">{copy.need}</span>
              </span>
              {looked ? (
                <span key={mode} style={{ animationDelay: `${index * 80}ms` }} className={`${CHIP} bg-success-subtle text-on-success-subtle`}>
                  <Check className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
                  {loud ? text.heard : text.kept}
                </span>
              ) : (
                <span key={mode} style={{ animationDelay: `${index * 80}ms` }} className={`${CHIP} border border-dashed border-border-strong text-text-muted`}>
                  <X className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
                  {text.missed}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
