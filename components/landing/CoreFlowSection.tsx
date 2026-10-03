"use client";

import { Sparkles, ArrowRight } from "lucide-react";
import { useMessages } from "@/lib/use-messages";

export default function CoreFlowSection() {
  const t = useMessages("landing");

  return (
    <section id="story-steps" className="relative w-full px-4 py-16 sm:px-6 md:px-12 lg:px-20 overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-h1 sm:text-display font-heading text-text">
            {t.steps.heading}
          </h2>
          <p className="mt-2 text-body text-text-muted">
            {t.steps.subtitle}
          </p>
        </div>

        {/* Vertical Timeline Wrapper */}
        <div className="relative">
          {/* Vertical dashed line in center for desktop / left for mobile */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-accent-300/70 -translate-x-1/2 pointer-events-none hidden sm:block" />

          <div className="space-y-16 sm:space-y-24">
            {t.steps.items.map((step, idx) => (
              <div
                key={idx}
                className={`relative flex flex-col md:flex-row items-center gap-8 md:gap-12 ${
                  idx % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Center Circle Timeline Node Indicator */}
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 z-10 hidden sm:flex size-7 items-center justify-center rounded-full border-4 border-accent-300 bg-background shadow-sm">
                  <div className="size-2 rounded-full bg-accent-600" />
                </div>

                {/* Left Side: Interactive Tilted Card inside Pastel Container */}
                <div className="w-full md:w-1/2">
                  <div className="rounded-3xl bg-[#fff8e7] dark:bg-accent-950/40 p-6 sm:p-10 transition-all duration-300 hover:bg-[#fff3d6]">
                    <div className="transform rotate-[-2deg] hover:rotate-0 hover:scale-[1.02] transition-transform duration-300 rounded-2xl bg-surface p-6 shadow-md border border-border">
                      <p className="text-caption font-bold text-text-muted mb-4 uppercase tracking-wider">
                        {step.chartTitle}
                      </p>

                      <div className="space-y-4">
                        {step.chartItems.map((item, itemIdx) => (
                          <div key={itemIdx}>
                            <div className="flex justify-between text-body-sm font-bold text-text mb-1">
                              <span>{item.label}</span>
                              <span className="text-primary">{item.val}</span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-surface-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                                style={{
                                  width: item.val.includes("%") ? item.val : "100%",
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-accent-100 dark:bg-accent-900/60 px-3.5 py-1.5 text-caption font-bold text-neutral-900 dark:text-accent-200">
                        <Sparkles className="size-3.5 text-accent-700 dark:text-accent" />
                        <span>{step.chartPill}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Step Description & Link */}
                <div className="w-full md:w-1/2 text-left space-y-4">
                  <div className="inline-flex items-center gap-1 rounded-full bg-accent-300 px-3 py-1 text-label font-bold text-neutral-950">
                    <Sparkles className="size-3.5 fill-neutral-950 text-neutral-950" />
                    <span>{step.number}</span>
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
                    className="inline-flex items-center gap-1.5 text-label-lg font-bold text-primary hover:text-primary-hover transition-colors pt-2 group"
                  >
                    <span>{step.cta}</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
