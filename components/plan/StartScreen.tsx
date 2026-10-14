"use client";

import { ArrowRight, Ticket, Users } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { Messages } from "@/lib/messages";
import { TEXT_LINK, buttonClass } from "@/components/ui/styles";
import CaptainNote from "./CaptainNote";
import { FORWARD_ARROW } from "./DeckFooter";

type StartScreenProps = {
  text: Messages["plan"];
  onStartManual: () => void;
  /** A quiet second way in under the start button: the plan saved on this device, when there is one. */
  resume?: ReactNode;
};

const STOPS = ["trip", "crew", "budget", "extras", "pass"] as const;

// The opening of a plan: the whole ride shown before it starts, so nobody wonders how long this takes or what
// comes next. The line runs down the page with each station named and what it asks, and the boarding pass waits
// at its end.
export default function StartScreen({ text, onStartManual, resume }: StartScreenProps) {
  const copy = text.start;
  return (
    <div className="grid w-full gap-8 motion-safe:animate-message-in lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-center lg:gap-16">
      <div>
        <h1 tabIndex={-1} className="text-h2 text-balance text-text outline-none sm:text-h1">
          {copy.title}
        </h1>
        <p className="mt-2 max-w-xl text-body text-pretty text-text-muted">{copy.lead}</p>
        <CaptainNote className="mt-4 max-w-xl">{copy.captain}</CaptainNote>
        <div className="mt-8 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-4">
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

      <ol aria-label={copy.routeLabel}>
        {STOPS.map((stop, index) => {
          const last = index === STOPS.length - 1;
          return (
            <li
              key={stop}
              style={{ "--item-index": index } as CSSProperties}
              className="relative flex items-start gap-4 py-2 motion-safe:animate-list-in"
            >
              {/* The stretch of line from this station's centre to the next one's. */}
              {!last && <span aria-hidden="true" className="absolute top-7 -bottom-7 left-5 w-1 -translate-x-1/2 bg-primary/20" />}
              <span
                aria-hidden="true"
                className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-4 border-primary text-label tabular-nums ${
                  last ? "bg-primary text-on-primary" : "bg-background text-primary"
                }`}
              >
                {last ? <Ticket className="size-4" aria-hidden="true" /> : index + 1}
              </span>
              <span className="min-w-0 flex-1 pt-1">
                <span className="block text-label-lg text-text">{copy.route[stop].name}</span>
                <span className="mt-1 block text-body-sm text-pretty text-text-muted">{copy.route[stop].asks}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
