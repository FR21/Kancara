"use client";

import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  Hotel,
  Languages,
  Loader2,
  PhoneCall,
  Share2,
  ShieldAlert,
  Sparkles,
  Utensils,
  Volume2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  type FieldPassData,
  buildFieldPassData,
  getSavedFieldPassOffline,
  playOfflineVoice,
  saveFieldPassOffline,
} from "@/lib/field-pass";
import { useLocale } from "@/lib/use-locale";

type FieldPassCardProps = {
  tripId: string;
  tripName: string;
  destination: string;
  memberCount: number;
  needs?: string[];
  customNeeds?: string[];
  lodgingText?: string;
  onDownloaded?: () => void;
};

export default function FieldPassCard({
  tripId,
  tripName,
  destination,
  memberCount,
  needs = [],
  customNeeds = [],
  lodgingText,
  onDownloaded,
}: FieldPassCardProps) {
  const locale = useLocale();
  const isEn = locale === "en";

  const [passData, setPassData] = useState<FieldPassData>(() =>
    buildFieldPassData(tripId, tripName, destination, memberCount, needs, customNeeds, lodgingText),
  );

  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [generatingAi, setGeneratingAi] = useState<boolean>(false);
  const [aiCustomized, setAiCustomized] = useState<boolean>(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeSpeech, setActiveSpeech] = useState<string | null>(null);

  const handleGenerateWithAI = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }
    setGeneratingAi(true);
    try {
      const res = await fetch("/api/field-pass/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          tripName,
          destination,
          memberCount,
          needs,
          customNeeds,
          lodgingText,
          locale,
        }),
      });
      if (res.ok) {
        const aiData: FieldPassData = await res.json();
        setPassData(aiData);
        setAiCustomized(true);
        await saveFieldPassOffline(tripId, aiData);
        setIsDownloaded(true);
        onDownloaded?.();
      }
    } catch (err) {
      console.error("AI customization failed:", err);
    } finally {
      setGeneratingAi(false);
    }
  };

  // Check saved state on mount or auto-tune with AI
  useEffect(() => {
    const saved = getSavedFieldPassOffline(tripId);
    if (saved) {
      setPassData(saved);
      setIsDownloaded(true);
      setAiCustomized(true);
    } else if (typeof navigator !== "undefined" && navigator.onLine) {
      // Auto-tune with AI on first open when online
      handleGenerateWithAI();
    }
  }, [tripId]);

  const handleDownload = async () => {
    setDownloading(true);
    const success = await saveFieldPassOffline(tripId, passData);
    if (success) {
      setIsDownloaded(true);
      setPassData((prev) => ({
        ...prev,
        downloadedAt: new Date().toISOString(),
      }));
      onDownloaded?.();
    }
    setDownloading(false);
  };

  const handleSpeak = (text: string, langTag: string, id: string) => {
    setActiveSpeech(id);
    playOfflineVoice(text, langTag);
    setTimeout(() => {
      setActiveSpeech((current) => (current === id ? null : current));
    }, 2500);
  };

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-3xl border-2 border-emerald-500/40 bg-surface shadow-2xl transition-all dark:border-emerald-500/30">
      {/* Top Banner (Status Bar) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-5 py-4 text-white sm:px-6">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-2xl">{passData.destinationFlag}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-black tracking-wide text-white uppercase text-label">
                Kancara Field Pass
              </span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold backdrop-blur-xs">
                {passData.countryName}
              </span>
            </div>
            <p className="truncate text-caption text-emerald-100 font-medium">
              {passData.tripName}
            </p>
          </div>
        </div>

        {/* Actions: AI Region Auto-Tune & Offline Download */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateWithAI}
            disabled={generatingAi}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-bold text-white border border-white/30 backdrop-blur-xs transition-all active:scale-95 disabled:opacity-50"
            title={isEn ? "Adapt to destination with AI" : "Sesuaikan wilayah dengan AI"}
          >
            {generatingAi ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>{isEn ? "AI Tuning..." : "AI Menyesuaikan..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="size-3.5 text-amber-300" />
                <span>
                  {aiCustomized
                    ? isEn ? "AI Tuned ✨" : "Wilayah AI ✨"
                    : isEn ? "Tune with AI" : "Sesuaikan AI"}
                </span>
              </>
            )}
          </button>

          {isDownloaded ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-3 py-1.5 text-xs font-bold text-white border border-emerald-300/40 backdrop-blur-xs">
              <CheckCircle2 className="size-3.5 text-emerald-200" />
              {isEn ? "Offline Ready" : "Siap Luring 🟢"}
            </span>
          ) : (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-emerald-900 shadow-md transition-all hover:bg-emerald-50 active:scale-95 disabled:opacity-50"
            >
              <Download className="size-3.5" />
              {downloading
                ? isEn ? "Saving..." : "Menyimpan..."
                : isEn ? "Save Offline" : "Unduh Offline"}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Body */}
      <div className="space-y-5 p-5 sm:p-6">
        {/* BLOCK 1: Accommodation & Address (For Taxi Drivers) */}
        <section className="rounded-2xl border border-border bg-surface-muted/60 p-4 transition-colors hover:border-border-strong">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="flex items-center gap-2 font-heading text-caption font-bold text-text-muted uppercase tracking-wider">
              <Hotel className="size-4 text-primary" />
              {isEn ? "Hotel / Residence Address" : "Alamat Hotel / Tempat Tinggal"}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {isEn ? "Show to Taxi Driver" : "Tunjukkan ke Supir Taksi"}
            </span>
          </div>

          <p className="font-heading text-h4 font-bold text-text">
            {passData.accommodation.name}
          </p>
          <p className="mt-1 font-mono text-body-sm text-text-muted select-all">
            {passData.accommodation.address}
          </p>

          <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={() =>
                handleSpeak(
                  passData.accommodation.name + ", " + passData.accommodation.address,
                  passData.langTag,
                  "hotel",
                )
              }
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-caption font-bold text-text transition-all hover:bg-surface-muted active:scale-95"
            >
              <Volume2
                className={`size-3.5 ${activeSpeech === "hotel" ? "text-primary animate-bounce" : "text-text-muted"}`}
              />
              {isEn ? "Speak Address" : "Dengarkan Alamat"}
            </button>
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  passData.accommodation.name + "\n" + passData.accommodation.address,
                  "hotel",
                )
              }
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-caption font-bold text-text transition-all hover:bg-surface-muted active:scale-95"
            >
              {copiedSection === "hotel" ? (
                <>
                  <Check className="size-3.5 text-success" />
                  {isEn ? "Copied!" : "Tersalin!"}
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-text-muted" />
                  {isEn ? "Copy" : "Salin"}
                </>
              )}
            </button>
          </div>
        </section>

        {/* BLOCK 2: Dietary Restrictions & Waiter Inquiry Card */}
        <section className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-4.5 dark:border-amber-500/20">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="flex items-center gap-2 font-heading text-caption font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              <Utensils className="size-4" />
              {isEn ? "Dietary Passport" : "Paspor Pantangan Makanan"}
            </span>
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full">
              {isEn ? "Show to Restaurant Staff" : "Tunjukkan ke Pelayan"}
            </span>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {passData.dietary.dietBadges.map((badge, idx) => (
              <span
                key={idx}
                className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-caption font-bold text-amber-900 dark:text-amber-200"
              >
                {badge}
              </span>
            ))}
            <span className="rounded-lg bg-surface border border-border px-2 py-1 text-caption font-semibold text-text-muted">
              👥 {passData.dietary.memberCount} {isEn ? "Members" : "Orang"}
            </span>
          </div>

          {/* High-Contrast Large Text for Local Staff */}
          <div className="rounded-xl border border-amber-500/30 bg-surface p-4 shadow-inner">
            <p className="font-heading text-h3 leading-snug font-bold text-text select-all">
              {passData.dietary.localScriptText}
            </p>
          </div>

          <p className="mt-2 text-caption text-text-muted italic">
            "{isEn ? passData.dietary.explanationEn : passData.dietary.explanationId}"
          </p>

          <div className="mt-3.5 flex flex-wrap gap-2 pt-2 border-t border-amber-500/20">
            <button
              type="button"
              onClick={() =>
                handleSpeak(passData.dietary.localScriptText, passData.langTag, "dietary")
              }
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-body-sm font-bold shadow-md shadow-amber-600/20 transition-all active:scale-95"
            >
              <Volume2
                className={`size-4 ${activeSpeech === "dietary" ? "animate-pulse" : ""}`}
              />
              {isEn ? "Speak to Waiter" : "Bacakan ke Pelayan 🔊"}
            </button>
            <button
              type="button"
              onClick={() => handleCopy(passData.dietary.localScriptText, "dietary")}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-body-sm font-bold text-text transition-all hover:bg-surface-muted active:scale-95"
            >
              {copiedSection === "dietary" ? (
                <>
                  <Check className="size-4 text-success" />
                  {isEn ? "Copied" : "Tersalin"}
                </>
              ) : (
                <>
                  <Copy className="size-4 text-text-muted" />
                  {isEn ? "Copy Japanese/Local" : "Salin Aksara"}
                </>
              )}
            </button>
          </div>
        </section>

        {/* BLOCK 3: 4 Essential Pocket Field Phrases */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-heading text-caption font-bold text-text-muted uppercase tracking-wider">
              <Languages className="size-4 text-emerald-600 dark:text-emerald-400" />
              {isEn ? "4 Instant Field Phrases" : "4 Frase Lapangan Instan"}
            </span>
            <span className="text-[11px] font-semibold text-text-muted">
              {isEn ? "Native TTS Voice" : "Audio Offline Tanpa Kuota"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {passData.phrases.map((phrase) => {
              const isSpeaking = activeSpeech === phrase.id;
              return (
                <div
                  key={phrase.id}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-3 transition-colors hover:border-emerald-500/40"
                >
                  <div>
                    <span className="text-caption font-semibold text-text-muted">
                      {isEn ? phrase.labelEn : phrase.labelId}
                    </span>
                    <p className="font-heading text-body font-bold text-text mt-0.5">
                      {phrase.localText}
                    </p>
                    <p className="font-mono text-caption text-emerald-600 dark:text-emerald-400">
                      {phrase.romanized}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => handleSpeak(phrase.localText, phrase.langTag, phrase.id)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-caption font-bold transition-all active:scale-95 ${
                        isSpeaking
                          ? "bg-emerald-600 text-white"
                          : "bg-surface-muted text-text hover:bg-emerald-500/10 hover:text-emerald-600"
                      }`}
                    >
                      <Volume2 className="size-3.5" />
                      {isEn ? "Listen" : "Suara"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(phrase.localText, phrase.id)}
                      className="p-1 text-text-muted hover:text-text cursor-pointer"
                      title={isEn ? "Copy" : "Salin"}
                    >
                      {copiedSection === phrase.id ? (
                        <Check className="size-3.5 text-success" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* BLOCK 4: Destination Emergency Numbers */}
        <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="size-4 text-red-600 dark:text-red-400" />
            <span className="font-heading text-caption font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
              {isEn ? "Destination Emergency Hotlines" : "Kontak Darurat Destinasi"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            <a
              href={`tel:${passData.emergency.police}`}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2.5 transition-all hover:border-red-500/40 active:scale-95"
            >
              <PhoneCall className="size-4 text-red-600 shrink-0" />
              <div className="min-w-0">
                <span className="block text-[11px] font-bold text-text-muted">
                  {isEn ? "Police" : "Polisi"}
                </span>
                <span className="block font-heading font-black text-text text-body-sm">
                  {passData.emergency.police}
                </span>
              </div>
            </a>

            <a
              href={`tel:${passData.emergency.ambulance}`}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2.5 transition-all hover:border-red-500/40 active:scale-95"
            >
              <PhoneCall className="size-4 text-red-600 shrink-0" />
              <div className="min-w-0">
                <span className="block text-[11px] font-bold text-text-muted">
                  {isEn ? "Ambulance" : "Ambulans"}
                </span>
                <span className="block font-heading font-black text-text text-body-sm">
                  {passData.emergency.ambulance}
                </span>
              </div>
            </a>

            <a
              href={`tel:${passData.emergency.embassyPhone}`}
              className="col-span-2 sm:col-span-1 flex items-center gap-2 rounded-xl border border-border bg-surface p-2.5 transition-all hover:border-red-500/40 active:scale-95"
            >
              <PhoneCall className="size-4 text-primary shrink-0" />
              <div className="min-w-0">
                <span className="block text-[11px] font-bold text-text-muted truncate">
                  {passData.emergency.embassyName}
                </span>
                <span className="block font-heading font-black text-text text-[11px] truncate">
                  {passData.emergency.embassyPhone}
                </span>
              </div>
            </a>
          </div>

          {passData.emergency.embassyAddress && (
            <p className="mt-2 text-[11px] text-text-muted truncate">
              🏛️ {passData.emergency.embassyAddress}
            </p>
          )}
        </section>

        {/* Footer info */}
        <footer className="text-center pt-2">
          <p className="text-caption text-text-muted">
            💡 {isEn
              ? "All data is securely cached on this device. Accessible with 0 kbps internet."
              : "Semua data tersimpan aman di memori perangkat. Tetap bisa diakses saat 0 sinyal."}
          </p>
        </footer>
      </div>
    </div>
  );
}
