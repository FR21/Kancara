"use client";

import { useMessages } from "@/lib/use-messages";
import Link from "next/link";

export default function Page() {
  const t = useMessages("about");

  return (
    <main className="flex-1 bg-background text-text min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full h-[60svh] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900 via-primary-800 to-background z-0" />
        
        {/* Decorative elements */}
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-accent-500 rounded-full blur-[100px] animate-orb-breathe" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary-500 rounded-full blur-[120px] animate-orb-breathe" style={{ animationDelay: "1s" }} />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-4xl px-4 text-center">
          <h1 className="font-heading text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 motion-safe:animate-rise-in drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
            {t.title}
          </h1>
          <p className="text-xl md:text-2xl text-primary-100 font-medium max-w-2xl mx-auto motion-safe:animate-rise-in drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]" style={{ animationDelay: "100ms" }}>
            {t.subtitle}
          </p>
        </div>
      </section>

      {/* Content Container */}
      <section className="relative z-20 -mt-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-24 space-y-24">
        
        {/* Intro Card */}
        <div className="bg-surface rounded-3xl p-8 md:p-12 shadow-xl border border-border motion-safe:animate-rise-in" style={{ animationDelay: "200ms" }}>
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xl md:text-2xl leading-relaxed text-text font-medium text-balance">
              {t.description}
            </p>
          </div>
        </div>

        {/* History / Story */}
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-h2 font-heading mb-6 text-primary-700 dark:text-primary-300">{t.historyTitle}</h2>
          <p className="text-lg md:text-xl text-text-muted leading-relaxed">
            {t.historyText}
          </p>
        </div>

        {/* Vision & Mission */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          <div className="group rounded-3xl bg-surface p-8 md:p-10 transition-transform duration-300 hover:scale-[1.02] border border-border hover:border-accent-400 hover:shadow-2xl">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent-100 text-accent-700 dark:bg-accent-900/50 dark:text-accent-300">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-h2 font-heading mb-4 text-text">{t.missionTitle}</h2>
            <p className="text-lg text-text-muted leading-relaxed">
              {t.missionText}
            </p>
          </div>

          <div className="group rounded-3xl bg-surface p-8 md:p-10 transition-transform duration-300 hover:scale-[1.02] border border-border hover:border-secondary-400 hover:shadow-2xl">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100 text-secondary-700 dark:bg-secondary-900/50 dark:text-secondary-300">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-h2 font-heading mb-4 text-text">{t.visionTitle}</h2>
            <p className="text-lg text-text-muted leading-relaxed">
              {t.visionText}
            </p>
          </div>
        </div>

        {/* Values */}
        <div>
          <h2 className="text-3xl md:text-4xl font-heading mb-10 text-center text-text">{t.valuesTitle}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-surface rounded-2xl p-6 border border-border">
              <h3 className="text-xl font-bold mb-3 text-text">{t.value1Title}</h3>
              <p className="text-text-muted">{t.value1Desc}</p>
            </div>
            <div className="bg-surface rounded-2xl p-6 border border-border">
              <h3 className="text-xl font-bold mb-3 text-text">{t.value2Title}</h3>
              <p className="text-text-muted">{t.value2Desc}</p>
            </div>
            <div className="bg-surface rounded-2xl p-6 border border-border">
              <h3 className="text-xl font-bold mb-3 text-text">{t.value3Title}</h3>
              <p className="text-text-muted">{t.value3Desc}</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 text-center bg-gradient-to-r from-primary-900 to-accent-900 rounded-3xl p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-heading font-extrabold text-white mb-6">
              {t.ctaTitle}
            </h2>
            <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
              {t.ctaText}
            </p>
            <Link 
              href="/"
              className="inline-block bg-white text-primary-900 font-bold text-lg px-8 py-4 rounded-full shadow-xl hover:scale-105 hover:shadow-2xl transition-all duration-300"
            >
              {t.ctaButton}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
