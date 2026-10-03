"use client";

import { Users, Heart, Calendar, ShieldCheck, Check } from "lucide-react";
import { useMessages } from "@/lib/use-messages";

export default function StatsSection() {
  const t = useMessages("landing");

  return (
    <section className="relative w-full px-4 py-16 sm:px-6 md:px-12 lg:px-20 bg-neutral-100 dark:bg-neutral-900/50">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-10">
          <h2 className="text-h1 sm:text-display font-heading text-text">
            {t.stats.heading}
          </h2>
          <p className="mt-2 text-body text-text-muted">
            {t.stats.subtitle}
          </p>
        </div>

        {/* 4 Bento Chart Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Card 1: Left Tall Card (Mint background with Vertical Bar Chart) */}
          <div className="md:col-span-5 rounded-3xl bg-white dark:bg-neutral-900 border border-border p-6 sm:p-8 flex flex-col justify-between min-h-[380px]">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                  <Users className="size-6" />
                </div>
                <span className="rounded-full bg-surface dark:bg-neutral-800 px-3 py-1 text-caption font-bold text-primary-700 dark:text-primary-300 border border-border">
                  {t.stats.card1Growth}
                </span>
              </div>

              <div className="mt-6">
                <h3 className="text-display font-heading font-extrabold text-neutral-900 dark:text-white text-4xl sm:text-5xl">
                  {t.stats.card1Value}
                </h3>
                <p className="mt-1 text-body-sm font-semibold text-neutral-600 dark:text-neutral-300">
                  {t.stats.card1Label}
                </p>
              </div>
            </div>

            {/* Vertical Bar Chart Graphic */}
            <div className="mt-8 pt-4">
              <div className="flex items-end justify-between gap-2 h-36 px-2">
                <div className="w-full bg-emerald-500/70 rounded-lg h-[40%]" />
                <div className="w-full bg-emerald-500/80 rounded-lg h-[65%]" />
                <div className="w-full bg-emerald-500/70 rounded-lg h-[50%]" />
                <div className="w-full bg-emerald-500/90 rounded-lg h-[80%]" />
                <div className="w-full bg-emerald-600 rounded-lg h-[90%]" />
                <div className="w-full bg-accent-300 rounded-lg h-[100%]" />
              </div>
              <div className="flex justify-between text-caption font-bold text-neutral-400 mt-2 px-1">
                <span>JAN</span>
                <span>JUL</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3 Cards Grid (2 top, 1 wide bottom) */}
          <div className="md:col-span-7 flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Card 2: Top Middle Card (Rating & Doughnut Chart) */}
              <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-border p-6 flex flex-col justify-between min-h-[190px]">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
                  <Heart className="size-6" />
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <h4 className="text-h1 font-heading font-extrabold text-text text-4xl">
                      {t.stats.card2Value}
                    </h4>
                    <p className="mt-1 text-caption font-medium text-text-muted leading-snug">
                      {t.stats.card2Label}
                    </p>
                  </div>

                  {/* Circular Doughnut Score Badge */}
                  <div className="relative size-16 shrink-0 flex items-center justify-center rounded-full border-4 border-accent-300 bg-surface">
                    <span className="text-caption font-bold text-text">
                      {t.stats.card2Rating}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Top Right Card (Hours Saved & Horizontal Comparison) */}
              <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-border p-6 flex flex-col justify-between min-h-[190px]">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-success-100 text-success-700">
                  <Calendar className="size-6" />
                </div>

                <div className="mt-3">
                  <h4 className="text-h1 font-heading font-extrabold text-text text-4xl">
                    {t.stats.card3Value}
                  </h4>
                  <p className="text-caption font-medium text-text-muted">
                    {t.stats.card3Label}
                  </p>

                  {/* Horizontal Bar Comparison */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-caption">
                      <span className="w-16 text-text-muted font-medium">{t.stats.card3Before.split(' (')[0]}</span>
                      <div className="h-2 flex-1 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                        <div className="h-full w-[90%] bg-neutral-400" />
                      </div>
                      <span className="text-caption font-bold text-text-muted">{t.stats.card3Before.match(/\((.*?)\)/)?.[1] || "11 jam"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-caption">
                      <span className="w-16 text-success font-bold">{t.stats.card3WithUs.split(' (')[0]}</span>
                      <div className="h-2 flex-1 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                        <div className="h-full w-[25%] bg-success" />
                      </div>
                      <span className="text-caption font-bold text-success">{t.stats.card3WithUs.match(/\((.*?)\)/)?.[1] || "2.5 jam"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Bottom Wide Dark Card (Offline Signal) */}
            <div className="rounded-3xl bg-[#052b3b] text-white p-6 sm:p-8 relative overflow-hidden flex flex-col justify-between min-h-[170px]">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-accent">
                <ShieldCheck className="size-6" />
              </div>

              <div className="mt-4 max-w-sm">
                <h4 className="text-h1 font-heading font-extrabold text-white text-3xl sm:text-4xl">
                  {t.stats.card4Value}{" "}
                  <span className="text-emerald-400 font-semibold">{t.stats.card4Label}</span>
                </h4>
              </div>

              {/* Bottom right decorative check badge */}
              <div className="absolute bottom-6 right-6 flex size-10 items-center justify-center rounded-full bg-emerald-500 text-neutral-950 font-bold">
                <Check className="size-6 stroke-[3]" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center text-caption font-semibold text-text-muted flex items-center justify-center gap-1.5">
          <span>{t.stats.footerNote}</span>
        </div>
      </div>
    </section>
  );
}
