"use client";

import { ArrowRight, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { TEXT_LINK, buttonClass } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import { FORWARD_ARROW } from "./DeckFooter";
import PlanBackdrop from "./PlanBackdrop";
import PlanRoute from "./PlanRoute";

type StartScreenProps = {
  text: Messages["plan"];
  onStartManual: () => void;
  /** A quiet second way in under the start button: the plan saved on this device, when there is one. */
  resume?: ReactNode;
};

/** A step of the opening, a beat after the one before it. */
function beat(milliseconds: number): CSSProperties {
  return { animationDelay: `${milliseconds}ms` };
}

// The opening of a plan, played once as the page arrives over the places a trip could go: Captain pops up and says
// hello, the heading and its one action rise in, and the plan's five steps stand on the right as a line of
// stations, so what is about to be asked is known before it starts.
export default function StartScreen({ text, onStartManual, resume }: StartScreenProps) {
  const copy = text.start;

  return (
    <div className="grid w-full items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-12 xl:gap-16">
      <PlanBackdrop />
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
        <div className="mb-6 flex w-full items-center justify-center gap-4 lg:justify-start">
          <Image
            src="/images/logo/kancara_mascot_captain_logo.webp"
            alt=""
            width={500}
            height={500}
            priority
            className="size-24 shrink-0 object-contain transition-[scale,rotate] duration-300 ease-spring hover:-rotate-3 hover:scale-105 motion-safe:animate-pop-in sm:size-28 lg:size-32"
          />
          {/* What Captain says, with a tail pointing back at him. */}
          <div
            style={beat(200)}
            className="relative max-w-60 surface-compact rounded-surface border border-primary/25 bg-surface px-surface py-3 motion-safe:animate-message-in sm:max-w-72"
          >
            <p className="text-left text-body-sm text-pretty text-text">{copy.captain}</p>
            <span
              aria-hidden="true"
              className="absolute top-1/2 -left-1.5 size-3 -translate-y-1/2 rotate-45 border-b border-l border-primary/25 bg-surface"
            />
          </div>
        </div>

        <h1 tabIndex={-1} style={beat(150)} className="font-heading text-h2 text-balance text-text outline-none motion-safe:animate-rise-in sm:text-h1">
          {copy.title}
        </h1>
        <p style={beat(250)} className="mt-4 max-w-xl text-body text-pretty text-text-muted motion-safe:animate-rise-in">
          {copy.lead}
        </p>

        <div
          style={beat(350)}
          className="mt-8 flex w-full flex-col items-stretch gap-3 motion-safe:animate-rise-in sm:w-auto sm:flex-row sm:items-center sm:gap-4"
        >
          <button type="button" onClick={onStartManual} className={`group ${buttonClass("primary", "large")}`}>
            {copy.form}
            <ArrowRight className={FORWARD_ARROW} aria-hidden="true" />
          </button>
          <Link href="/profile/saved-members" className={`${TEXT_LINK} justify-center`}>
            <Users className="size-4" aria-hidden="true" />
            {copy.savedProfiles}
          </Link>
        </div>
        {resume && <div className="mt-4 motion-safe:animate-message-in motion-safe:[animation-delay:400ms]">{resume}</div>}

      </div>

      <div style={beat(300)} className="motion-safe:animate-rise-in">
        <PlanRoute text={copy} />
      </div>
    </div>
  );
}
