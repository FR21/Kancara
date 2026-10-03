"use client";

import { WifiOff, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import { useMessages } from "@/lib/use-messages";

export default function OfflineSection() {
  const t = useMessages("landing");

  return (
    <section id="pwa-info" className="relative w-full px-4 py-16 sm:px-6 md:px-12 lg:px-20 overflow-hidden bg-neutral-100 dark:bg-neutral-900/50">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left Column Text & Bullet List */}
          <div className="flex-1 text-left space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-3.5 py-1 text-caption font-bold text-emerald-800 dark:text-emerald-300">
              <WifiOff className="size-4 text-emerald-600" />
              <span>{t.offline.badge}</span>
            </div>

            <h2 className="text-display font-heading font-extrabold text-text text-4xl sm:text-5xl leading-tight">
              {t.offline.titlePart1} <br />
              <span className="text-emerald-600 dark:text-emerald-400">
                {t.offline.titlePart2}
              </span>
            </h2>

            <p className="text-body-lg text-text-muted leading-relaxed max-w-lg">
              {t.offline.description}
            </p>

            <ul className="space-y-3 pt-2">
              {t.offline.points.map((point, idx) => (
                <li key={idx} className="flex items-center gap-3 text-body-sm font-bold text-text">
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <div className="pt-4">
              <a
                href="/plan"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary hover:bg-primary-hover text-on-primary font-bold px-7 py-3.5 text-label-lg transition-all shadow-md active:scale-[0.98]"
              >
                <span>{t.offline.cta}</span>
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>

          {/* Right Column: Authentic Mobile Phone Ratio Mockup (Aspect ~9:18.5) */}
          <div className="flex-1 w-full flex justify-center">
            <div className="relative w-full max-w-[290px] min-h-[580px] rounded-[48px] border-[10px] border-neutral-900 bg-surface p-3.5 shadow-2xl flex flex-col justify-between">
              {/* Top Notch / Dynamic Island */}
              <div className="mx-auto mb-2 h-4 w-28 rounded-full bg-neutral-900" />

              {/* App Screen Container */}
              <div className="flex-1 rounded-[32px] bg-background p-3.5 border border-border flex flex-col justify-between space-y-3">
                {/* App Header */}
                <div className="flex items-center justify-between text-caption font-bold">
                  <div className="flex items-center gap-1 text-primary">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span>kancara</span>
                  </div>
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-caption font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    ✓ Tersimpan
                  </span>
                </div>

                {/* Map Grid Area (Tall Ratio) */}
                <div className="relative flex-1 min-h-[280px] w-full rounded-2xl bg-surface border border-border p-3.5 flex flex-col justify-between overflow-hidden">
                  {/* Grid Lines Background */}
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#63acaf_1px,transparent_1px)] [background-size:16px_16px]" />

                  {/* Top Destination Badge */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-surface-muted rounded-full px-2.5 py-1 text-caption font-bold text-text border border-border shadow-xs">
                      📍 Pine Ridge Camp
                    </div>
                  </div>

                  {/* Connected Avatar Nodes on Arc */}
                  <div className="relative z-10 flex items-center justify-center my-8">
                    <div className="relative size-36 border-2 border-dashed border-emerald-500 rounded-full flex items-center justify-center">
                      <div className="absolute -top-1 left-2 size-8 rounded-full bg-primary-600 text-white font-bold text-caption flex items-center justify-center shadow-md">J</div>
                      <div className="absolute top-4 right-0 size-8 rounded-full bg-accent-400 text-neutral-950 font-bold text-caption flex items-center justify-center shadow-md">S</div>
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 size-8 rounded-full bg-secondary-500 text-neutral-950 font-bold text-caption flex items-center justify-center shadow-md">M</div>
                    </div>
                  </div>

                  {/* Bottom Connection Status */}
                  <div className="relative z-10 text-center">
                    <span className="text-caption font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Peer-to-Peer Grid Active
                    </span>
                  </div>
                </div>

                {/* Status Card */}
                <div className="rounded-xl bg-surface p-3 border border-border flex items-center gap-3">
                  <CheckCircle2 className="size-6 text-emerald-500 shrink-0" />
                  <div className="text-left">
                    <p className="text-body-sm font-bold text-text">{t.offline.statusPill}</p>
                    <p className="text-caption text-text-muted">{t.offline.subStatus}</p>
                  </div>
                </div>

                {/* Bottom App Action Button */}
                <div className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-center text-label transition-colors">
                  Saya Bersama Rombongan
                </div>
              </div>

              {/* Floating Yellow Badge Bottom Right */}
              <div className="absolute -bottom-12 right-0 sm:-bottom-4 sm:-right-8 rounded-2xl bg-accent-300 p-3 shadow-lg text-neutral-950 flex items-center gap-2 max-w-[175px] border border-accent-400 z-20">
                <ShieldCheck className="size-5 shrink-0 text-neutral-950" />
                <span className="text-caption font-bold leading-tight">
                  {t.offline.floatBadge}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
