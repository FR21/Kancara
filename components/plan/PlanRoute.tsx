"use client";

import { MapPin, Sparkles, Ticket, Users, Wallet, type LucideIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EASE } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import { useMediaQuery } from "@/lib/use-media-query";

const STOPS = ["trip", "crew", "budget", "extras", "pass"] as const;
type StopKey = (typeof STOPS)[number];
type StopState = "passed" | "active" | "upcoming";

const STOP_ICONS: Record<StopKey, LucideIcon> = {
  trip: MapPin,
  crew: Users,
  budget: Wallet,
  extras: Sparkles,
  pass: Ticket,
};

const NODE: Record<StopState, string> = {
  passed: "border-primary bg-primary-subtle text-primary",
  active: "border-primary bg-primary text-on-primary",
  upcoming: "border-border-strong bg-surface text-text-muted",
};
const NAME: Record<StopState, string> = {
  passed: "text-text",
  active: "text-primary",
  upcoming: "text-text-muted",
};
const ASKS: Record<StopState, string> = {
  passed: "text-text-muted",
  active: "text-text",
  upcoming: "text-text-muted",
};

/** How long each step is shown before the route moves on. */
const STEP_MS = 3200;
/** When the first station appears in the page's opening, and how far apart the rest follow. */
const STATION_ARRIVAL_MS = 450;
const STATION_STEP_MS = 90;

function stateOf(index: number, active: number): StopState {
  if (index < active) return "passed";
  return index === active ? "active" : "upcoming";
}

type Track = { start: number; length: number; progress: number };

// The plan's five steps as one line of stations. One moment repeats: the line is drawn from the station before to
// the next one, and the station it reaches fills and settles as it arrives, so the order of the steps is read by
// watching it rather than by numbers. It pauses while it is pointed at or holds the focus, any station can be
// picked by hand, and with reduced motion it stands still on the first step.
export default function PlanRoute({ text }: { text: Messages["plan"]["start"] }) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const nodeRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // The line runs through the centres of the stations, measured, because a description that wraps to a third line
  // on a narrow screen moves every station below it.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const top = list.getBoundingClientRect().top;
      const centres = nodeRefs.current.map((node) => {
        const box = node?.getBoundingClientRect();
        return box ? box.top - top + box.height / 2 : 0;
      });
      const start = centres[0] ?? 0;
      const end = centres[centres.length - 1] ?? start;
      setTrack({ start, length: end - start, progress: (centres[active] ?? start) - start });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    // The stations rise into place as the page opens, which moves them without resizing the list: measure again
    // once they have settled.
    const settled = window.setTimeout(measure, STATION_ARRIVAL_MS + STOPS.length * STATION_STEP_MS + 400);
    return () => {
      observer.disconnect();
      window.clearTimeout(settled);
    };
  }, [active]);

  // Moves on by itself only while it can be seen and nobody is reading it.
  useEffect(() => {
    if (reduceMotion || paused) return;
    const root = rootRef.current;
    if (!root) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let inView = false;
    const run = () => {
      clearInterval(timer);
      timer = undefined;
      if (!inView || document.visibilityState !== "visible") return;
      timer = setInterval(() => setActive((current) => (current + 1) % STOPS.length), STEP_MS);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      run();
    }, { threshold: 0.2 });
    observer.observe(root);
    document.addEventListener("visibilitychange", run);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", run);
      clearInterval(timer);
    };
  }, [reduceMotion, paused]);

  return (
    <div
      ref={rootRef}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="rounded-surface border border-border bg-surface p-surface"
    >
      <div className="flex items-baseline justify-between gap-4 px-2">
        <h2 className="text-label-lg text-text">{text.routeLabel}</h2>
        <p className="text-caption text-text-muted tabular-nums" aria-hidden="true">
          {active + 1} / {STOPS.length}
        </p>
      </div>

      <ol ref={listRef} aria-label={text.routeLabel} className="relative mt-4 space-y-1">
        {track && (
          <>
            {/* The whole line, then the drawn part of it up to the station being shown. */}
            <span
              aria-hidden="true"
              className="absolute left-6.5 w-0.5 -translate-x-1/2 rounded-full bg-border"
              style={{ top: track.start, height: track.length }}
            />
            <span
              aria-hidden="true"
              className={`absolute left-6.5 w-0.5 -translate-x-1/2 rounded-full bg-primary transition-[height] duration-700 motion-reduce:transition-none ${EASE}`}
              style={{ top: track.start, height: track.progress }}
            />
          </>
        )}

        {STOPS.map((stop, index) => {
          const state = stateOf(index, active);
          const Icon = STOP_ICONS[stop];
          return (
            // The stations arrive one after another as the page opens, after the panel itself.
            <li key={stop} style={{ animationDelay: `${STATION_ARRIVAL_MS + index * STATION_STEP_MS}ms` }} className="motion-safe:animate-message-in">
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-current={state === "active" ? "step" : undefined}
                className="group/station grid w-full cursor-pointer grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-4 rounded-lg p-2 text-left transition-[background-color] duration-150 ease-out hover:bg-surface-muted"
              >
                <span
                  ref={(element) => {
                    nodeRefs.current[index] = element;
                  }}
                  aria-hidden="true"
                  className={`relative flex size-9 items-center justify-center rounded-full border-2 transition-[background-color,border-color,color] duration-300 ease-out ${NODE[state]}`}
                >
                  {/* A new key on arrival plays the settle once, after the line has nearly reached it. */}
                  <span
                    key={state === "active" ? `arrived-${active}` : "still"}
                    className={state === "active" ? "motion-safe:animate-stamp-in motion-safe:[animation-delay:350ms]" : ""}
                  >
                    <Icon className="size-4" />
                  </span>
                </span>
                <span className="min-w-0 pt-2">
                  <span className={`block text-label transition-colors duration-300 ease-out ${NAME[state]}`}>
                    {text.route[stop].name}
                  </span>
                  <span className={`mt-1 block text-body-sm text-pretty transition-colors duration-300 ease-out ${ASKS[state]}`}>
                    {text.route[stop].asks}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
