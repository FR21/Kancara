"use client";

import { ArrowRight } from "lucide-react";
import { useMessages } from "@/lib/use-messages";

export default function CtaSection() {
  const t = useMessages("landing");

  return (
    <section className="relative w-full bg-[#052b3b] text-white py-20 px-4 sm:px-6 md:px-12 lg:px-20 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 size-96 rounded-full bg-accent-300/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-secondary-400/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl text-center space-y-6">
        <h2 className="text-display font-heading font-extrabold text-white text-4xl sm:text-5xl leading-tight">
          {t.cta.heading}
        </h2>

        <p className="mx-auto max-w-2xl text-body-lg sm:text-h3 font-normal text-neutral-300 leading-relaxed">
          {t.cta.description}
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/plan"
            className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-accent-300 hover:bg-accent-200 text-neutral-950 font-bold px-8 py-4 text-label-lg transition-all active:scale-[0.98]"
          >
            <span>{t.cta.ctaPrimary}</span>
            <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
          </a>

          <a
            href="#pwa-info"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 text-label-lg border border-white/20 transition-all active:scale-[0.98]"
          >
            <span>{t.cta.ctaSecondary}</span>
          </a>
        </div>

        <p className="text-caption text-neutral-400 font-medium pt-2">
          {t.cta.note}
        </p>
      </div>
    </section>
  );
}
