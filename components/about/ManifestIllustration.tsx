"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import MemberAvatar from "@/components/ui/MemberAvatar";
import SegmentedToggle from "@/components/ui/SegmentedToggle";
import { BADGE, EASE } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import type { AgeGroup } from "@/lib/plan-draft";

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
const MODES: Mode[] = ["usual", "kancara"];
const AUTO_SWITCH_MS = 1400;
const CHIP = `${BADGE} shrink-0 motion-safe:animate-pop-in`;

// An illustration of what Kancara changes: the same five people, planned the
// usual way and planned with every need written down first.
export default function ManifestIllustration({ text }: ManifestIllustrationProps) {
  const [mode, setMode] = useState<Mode>("usual");
  const rootRef = useRef<HTMLDivElement>(null);
  const touchedRef = useRef(false);

  // Once the list scrolls into view it boards everyone by itself, unless the
  // visitor has already used the switch.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        timer = setTimeout(() => {
          if (!touchedRef.current) setMode("kancara");
        }, AUTO_SWITCH_MS);
      },
      { threshold: 0.6 },
    );
    observer.observe(root);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const choose = (next: Mode) => {
    touchedRef.current = true;
    setMode(next);
  };

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
        <span className={`${BADGE} shrink-0 border border-border-strong text-text-muted`}>
          {text.sample}
        </span>
      </div>

      <SegmentedToggle
        name="manifest-mode"
        label={text.switchLabel}
        options={MODES}
        labels={{ usual: text.usual, kancara: text.kancara }}
        value={mode}
        onChange={choose}
        block
        className="mt-4"
      />

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
                  className={`size-14 transition-[scale,opacity] duration-300 ${EASE} motion-reduce:transition-none ${avatarScale(loud)}`}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-label-lg ${looked ? "text-text" : "text-text-muted"}`}>{copy.name}</span>
                <span className="block text-body-sm text-text-muted">{copy.need}</span>
              </span>
              {looked ? (
                <span key={mode} className={`${CHIP} bg-success-subtle text-on-success-subtle`}>
                  <Check className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
                  {loud ? text.heard : text.kept}
                </span>
              ) : (
                <span key={mode} className={`${CHIP} border border-dashed border-border-strong text-text-muted`}>
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
