"use client";

import { ArrowRight, Plane } from "lucide-react";
import { useInViewAttribute } from "@/lib/use-in-view";
import { useMessages } from "@/lib/use-messages";
import ScrollReveal from "./ScrollReveal";
import StepVisual, { type StepVisualKind } from "./StepVisual";

const STEP_VISUALS: StepVisualKind[] = ["match", "checklist", "live"];

export default function CoreFlowSection() {
  const t = useMessages("landing");
  const timelineRef = useInViewAttribute<HTMLDivElement>();

  return (
    <section id="story-steps" className="relative w-full px-4 py-16 sm:px-6 md:px-12 lg:px-20 overflow-x-clip">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal className="text-center mb-10 sm:mb-16">
          <h2 className="text-h1 sm:text-display font-heading text-text">
            {t.steps.heading}
          </h2>
          <p className="mt-2 text-body text-text-muted">
            {t.steps.subtitle}
          </p>
        </ScrollReveal>

        {/* Vertical Timeline Wrapper */}
        <div ref={timelineRef} className="group/timeline timeline-scope relative">
          {/* Vertical dashed line in center for desktop / left for mobile */}
          <div className="pointer-events-none absolute top-0 bottom-0 left-4 hidden w-0.5 -translate-x-1/2 sm:block md:left-1/2">
            <div className="timeline-track absolute inset-0 opacity-70" />
            <div className="timeline-fill absolute inset-0 bg-accent-400" />
          </div>

          <div className="space-y-16 sm:space-y-24">
            {t.steps.items.map((step, idx) => (
              <div
                key={idx}
                className={`relative flex flex-col-reverse md:flex-row items-center gap-6 md:gap-12 ${
                  idx % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Center Circle Timeline Node Indicator */}
                <div className="timeline-activate absolute left-4 md:left-1/2 -translate-x-1/2 z-10 hidden sm:flex size-7 items-center justify-center rounded-full border-4 border-accent-300 bg-background shadow-sm">
                  <div className="size-2 rounded-full bg-accent-600" />
                </div>

                {/* Left Side: Interactive Tilted Card inside Pastel Container */}
                <ScrollReveal from={idx % 2 === 0 ? "left" : "right"} className="w-full md:w-1/2">
                  <StepVisual
                    kind={STEP_VISUALS[idx % STEP_VISUALS.length]}
                    title={step.chartTitle}
                    items={step.chartItems}
                    result={step.chartPill}
                    liveLabel={t.steps.liveLabel}
                  />
                </ScrollReveal>

                {/* Right Side: Step Description & Link */}
                <ScrollReveal delayMs={120} className="w-full md:w-1/2 text-left space-y-4">
                  <div className="ticket-notch inline-flex h-6 items-center rounded-sm bg-accent-300 px-3 text-caption font-bold text-neutral-950 [--ticket-notch-size:0.25rem]">
                    <Plane className="size-3" aria-hidden="true" />
                    <span aria-hidden="true" className="mx-2 h-3 border-l border-dashed border-neutral-950/50" />
                    <span className="tabular-nums">{step.number}</span>
                  </div>

                  <h3 className="text-display font-heading font-extrabold text-text text-3xl sm:text-4xl">
                    {step.title}
                  </h3>

                  <p className="text-h3 font-semibold text-primary">
                    {step.subheading}
                  </p>

                  <p className="text-body text-text-muted leading-relaxed max-w-md">
                    {step.description}
                  </p>

                  <a
                    href="/plan"
                    className="inline-flex min-h-11 items-center gap-1.5 text-label-lg font-bold text-primary hover:text-primary-hover transition-colors group"
                  >
                    <span>{step.cta}</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </ScrollReveal>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
