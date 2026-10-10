"use client";

import { Plane } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useMediaQuery } from "@/lib/use-media-query";
import { useTilt } from "@/lib/use-tilt";

type CaptainGreeterProps = {
  /** What Captain says, one line after another. */
  lines: string[];
  /** Names the mascot for assistive technology: tapping it makes Captain say the next line. */
  label: string;
};

const TYPE_MS = 34;
const READ_MS = 2600;
const MAX_LEAN_DEGREES = 10;

// Captain at the start of a plan. It bobs over a shadow that answers the bob, leans toward the pointer, has a
// plane circling it, types out a greeting that keeps changing, and hops when tapped. With reduced motion it
// stands still and a tap swaps the line without typing it.
export default function CaptainGreeter({ lines, label }: CaptainGreeterProps) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const leanRef = useTilt<HTMLButtonElement>(MAX_LEAN_DEGREES);
  const [line, setLine] = useState(0);
  const [typed, setTyped] = useState(0);
  const [hops, setHops] = useState(0);
  const sentence = lines[line] ?? "";
  const done = typed >= sentence.length;

  // One letter at a time, then a pause to read, then the next line.
  useEffect(() => {
    if (reduceMotion) return;
    const timer = setTimeout(
      () => {
        if (!done) setTyped((count) => count + 1);
        else {
          setLine((current) => (current + 1) % lines.length);
          setTyped(0);
        }
      },
      done ? READ_MS : TYPE_MS,
    );
    return () => clearTimeout(timer);
  }, [reduceMotion, done, typed, line, lines.length]);

  const greet = () => {
    setHops((count) => count + 1);
    setLine((current) => (current + 1) % lines.length);
    setTyped(0);
  };

  return (
    <div className="flex flex-col items-center">
      <p
        aria-hidden="true"
        className="relative flex min-h-14 max-w-xs items-center rounded-3xl bg-surface px-5 py-3 text-center text-label-lg text-balance text-text shadow-lg ring-1 shadow-neutral-950/10 ring-border motion-safe:animate-pop-in"
      >
        <span>
          {reduceMotion ? sentence : sentence.slice(0, typed)}
          {!reduceMotion && (
            <span className={`ml-px inline-block h-4 w-0.5 translate-y-0.5 bg-primary ${done ? "animate-pulse" : ""}`} />
          )}
        </span>
        <span className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 border-r border-b border-border bg-surface" />
      </p>

      <button
        ref={leanRef}
        type="button"
        aria-label={label}
        onClick={greet}
        className="group/captain relative mt-6 cursor-pointer rounded-full p-6 outline-offset-4"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-2 border-dashed border-primary/35 motion-safe:animate-turn"
        >
          <Plane className="absolute -top-3 left-1/2 size-6 -translate-x-1/2 rotate-45 fill-background text-accent" />
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-4 rounded-full bg-primary/15 blur-xl transition-[background-color] duration-500 group-hover/captain:bg-primary/30"
        />
        <span
          key={hops}
          className={`relative block [transform:perspective(40rem)_rotateX(calc(var(--tilt-y,0deg)*-1))_rotateY(var(--tilt-x,0deg))] transition-transform duration-300 ease-out ${
            hops > 0 ? "motion-safe:animate-hop" : ""
          }`}
        >
          <span className="block motion-safe:animate-float">
            <Image
              src="/images/logo/kancara_mascot_captain_logo.webp"
              alt=""
              width={500}
              height={500}
              sizes="(min-width: 1024px) 160px, 128px"
              priority
              className="size-32 drop-shadow-2xl transition-[scale] duration-300 ease-spring group-hover/captain:scale-105 group-active/captain:scale-95 lg:size-40"
            />
          </span>
        </span>
        <span
          aria-hidden="true"
          className="absolute bottom-3 left-1/2 h-3 w-20 -translate-x-1/2 rounded-full bg-neutral-950/20 blur-sm motion-safe:animate-shadow-breathe dark:bg-neutral-950/60"
        />
      </button>
    </div>
  );
}
