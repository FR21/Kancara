"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { TEXT_LINK } from "@/components/ui/styles";
import { useInViewAttribute } from "@/lib/use-in-view";
import { useMessages } from "@/lib/use-messages";
import ScrollReveal from "./ScrollReveal";
import StepVisual, { type StepVisualKind } from "./StepVisual";

const STEP_VISUALS: StepVisualKind[] = ["match", "checklist", "live"];

export default function CoreFlowSection() {
  const t = useMessages("landing");
  const timelineRef = useInViewAttribute<HTMLDivElement>();

  return (
    <section id="story-steps" className="relative w-full overflow-x-clip px-4 py-16 sm:px-6 sm:py-24 md:px-12 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal className="mb-12 text-center">
          <h2 className="font-heading text-h1 text-balance text-text sm:text-display">
            {t.steps.heading}
          </h2>
          <p className="mt-4 text-body text-pretty text-text-muted">
            {t.steps.subtitle}
          </p>
        </ScrollReveal>

        <div ref={timelineRef} className="group/timeline timeline-scope relative">
          <div className="pointer-events-none absolute top-0 bottom-0 left-4 hidden w-0.5 -translate-x-1/2 sm:block md:left-1/2">
            <div className="timeline-track absolute inset-0 opacity-70" />
            <div className="timeline-fill absolute inset-0 bg-accent-400" />
          </div>

          <ol className="space-y-16 sm:space-y-24">
            {t.steps.items.map((step, index) => (
              <li
                key={step.number}
                className={`relative flex flex-col-reverse items-center gap-6 md:flex-row md:gap-16 ${
                  index % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* The station on the line carries the step's number; the list itself gives the order to a screen reader. */}
                <span
                  aria-hidden="true"
                  className="timeline-activate absolute left-4 z-10 hidden size-9 -translate-x-1/2 items-center justify-center rounded-full border-4 border-accent-300 bg-background text-caption font-bold text-text tabular-nums shadow-sm sm:flex md:left-1/2"
                >
                  {step.number}
                </span>

                <ScrollReveal from={index % 2 === 0 ? "left" : "right"} className="w-full md:w-1/2">
                  <StepVisual
                    kind={STEP_VISUALS[index % STEP_VISUALS.length]}
                    title={step.chartTitle}
                    items={step.chartItems}
                    result={step.chartPill}
                    liveLabel={t.steps.liveLabel}
                    align={index % 2 === 0 ? "end" : "start"}
                  />
                </ScrollReveal>

                <ScrollReveal delayMs={120} className={`w-full text-left md:w-1/2 ${index % 2 === 0 ? "md:pl-4" : "md:pr-4"}`}>
                  <h3 className="font-heading text-h1 font-extrabold text-balance text-text sm:text-4xl">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-h3 font-semibold text-pretty text-primary">
                    {step.subheading}
                  </p>

                  <p className="mt-4 max-w-md text-body leading-relaxed text-pretty text-text-muted">
                    {step.description}
                  </p>

                  <Link href="/plan" className={`mt-2 ${TEXT_LINK}`}>
                    {step.cta}
                    <ArrowRight
                      className="size-4 transition-[translate] duration-200 ease-out group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Link>
                </ScrollReveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
