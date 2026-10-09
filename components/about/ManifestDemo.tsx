"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import MemberAvatar from "@/components/plan/MemberAvatar";
import { EASE } from "@/components/plan/styles";
import type { Messages } from "@/lib/messages";
import type { AgeGroup } from "@/lib/plan-draft";

type ManifestDemoProps = {
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
const CHIP = "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-caption font-bold motion-safe:animate-pop-in";

// An illustration of what Kancara changes: the same five people, planned the
// usual way and planned with every need written down first.
export default function ManifestDemo({ text }: ManifestDemoProps) {
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

  const avatarSize = (loud: boolean) => {
    if (fair) return "size-11";
    return loud ? "size-14" : "size-8 opacity-50";
  };

  return (
    <div ref={rootRef} className="rounded-3xl bg-primary-100 p-4 sm:p-8 dark:bg-primary-950">
      {/* The list drifts a little inside its frame as the page scrolls. */}
      <div className="parallax-y rounded-2xl border border-border bg-background p-4 shadow-md shadow-neutral-950/10 [--parallax-from:1rem] [--parallax-to:-1rem] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-sans text-label-lg text-text">{text.title}</h3>
          <span className="shrink-0 rounded-full border border-border-strong px-2 py-1 text-caption font-bold text-text-muted">
            {text.sample}
          </span>
        </div>

        <div
          role="group"
          aria-label={text.switchLabel}
          className="relative mt-4 grid grid-cols-2 rounded-full border border-border-strong bg-surface p-1"
        >
          <span
            aria-hidden="true"
            className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary transition-[translate] duration-200 ${EASE} motion-reduce:transition-none ${
              fair ? "translate-x-full" : ""
            }`}
          />
          {MODES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => choose(option)}
              className={`relative inline-flex h-11 cursor-pointer items-center justify-center rounded-full px-3 text-label whitespace-nowrap transition-[color,scale] duration-150 ease-out active:scale-[0.97] ${
                mode === option ? "text-on-primary" : "text-text-muted hover:text-text"
              }`}
            >
              {text[option]}
            </button>
          ))}
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
                    className={`transition-[width,height,opacity] duration-300 ${EASE} motion-reduce:transition-none ${avatarSize(loud)}`}
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
    </div>
  );
}
