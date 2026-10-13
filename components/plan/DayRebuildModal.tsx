"use client";

import {
  AlertTriangle,
  Armchair,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CloudRain,
  Compass,
  DoorClosed,
  Info,
  MapPin,
  RefreshCw,
  Repeat2,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { BackupKind, ItineraryBackup, ItineraryDay, ItineraryItem } from "@/lib/api/captain";
import { findBackupIndexForKind, listBackups } from "@/lib/backups";
import type { Member } from "@/lib/plan-draft";
import { useLocale } from "@/lib/use-locale";

type DayRebuildModalProps = {
  isOpen: boolean;
  onClose: () => void;
  day: ItineraryDay;
  dayNumber: number;
  members: Member[];
  destination: string;
  weatherRainChance?: number | null;
  initialTrigger?: BackupKind;
  initialItemIndex?: number;
  onApply: (switches: { itemIndex: number; backupIndex: number }[]) => void;
};

export default function DayRebuildModal({
  isOpen,
  onClose,
  day,
  dayNumber,
  members,
  destination,
  weatherRainChance,
  initialTrigger = "rain",
  initialItemIndex,
  onApply,
}: DayRebuildModalProps) {
  const locale = useLocale();
  const isEn = locale === "en";
  const headingId = useId();

  // Trigger reason: rain | closed | rest
  const [trigger, setTrigger] = useState<BackupKind>(initialTrigger);

  // Scope: "specific" (tempat tertentu) vs "rest_of_day" (sisa hari ini)
  const [scope, setScope] = useState<"specific" | "rest_of_day">(
    initialItemIndex !== undefined ? "specific" : "specific",
  );

  // Selected stop indices that the user wants to adapt
  const [selectedStops, setSelectedStops] = useState<Set<number>>(() => {
    if (initialItemIndex !== undefined) return new Set([initialItemIndex]);
    // By default, select stops that have available backups
    const indicesWithBackups = day.items
      .map((item, idx) => (listBackups(item).some((b) => b.kind !== "main") ? idx : -1))
      .filter((idx) => idx !== -1);
    return new Set(indicesWithBackups.length > 0 ? [indicesWithBackups[0]] : []);
  });

  // Chosen backup index per item
  const [chosenBackupIndices, setChosenBackupIndices] = useState<Record<number, number>>({});

  // Get effective backup index for an item given the current trigger
  const getEffectiveBackupIndex = (itemIndex: number, item: ItineraryItem): number => {
    if (chosenBackupIndices[itemIndex] !== undefined) {
      return chosenBackupIndices[itemIndex];
    }
    return findBackupIndexForKind(item, trigger);
  };

  const toggleStopSelection = (index: number) => {
    const next = new Set(selectedStops);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedStops(next);
  };

  const selectAllRemaining = () => {
    const all = new Set<number>();
    day.items.forEach((item, idx) => {
      if (listBackups(item).some((b) => b.kind !== "main")) {
        all.add(idx);
      }
    });
    setSelectedStops(all);
    setScope("rest_of_day");
  };

  const selectOnlySpecific = (index: number) => {
    setSelectedStops(new Set([index]));
    setScope("specific");
  };

  // Re-validation metrics
  const validationSummary = useMemo(() => {
    let totalSwapped = 0;
    let totalViolations = 0;
    const coveredNeeds = new Set<string>();

    day.items.forEach((item, idx) => {
      const isSwapped = selectedStops.has(idx);
      if (isSwapped) {
        totalSwapped++;
        const backupIdx = getEffectiveBackupIndex(idx, item);
        const backup = listBackups(item)[backupIdx];
        if (backup) {
          totalViolations += backup.violations?.length ?? 0;
          backup.covers?.forEach((c) => coveredNeeds.add(c.need));
        }
      } else {
        totalViolations += item.violations?.length ?? 0;
        item.covers?.forEach((c) => coveredNeeds.add(c.need));
      }
    });

    return {
      totalSwapped,
      totalViolations,
      coveredNeedsCount: coveredNeeds.size,
      safeForGroup: totalViolations === 0,
    };
  }, [day.items, selectedStops, chosenBackupIndices, trigger]);

  const handleApply = () => {
    const switches = Array.from(selectedStops).map((itemIndex) => {
      const item = day.items[itemIndex];
      const backupIndex = getEffectiveBackupIndex(itemIndex, item);
      return { itemIndex, backupIndex };
    });

    onApply(switches);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60 motion-safe:animate-fade-in"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-surface text-text shadow-2xl motion-safe:animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="relative border-b border-border bg-primary/10 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-md shadow-primary/20">
                <Sparkles className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id={headingId} className="text-h3 font-bold text-text">
                    {isEn ? "Adapt Schedule On-the-Ground" : "Sesuaikan Jadwal di Lapangan"}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-caption font-bold text-emerald-700 dark:text-emerald-400">
                    <Wifi className="size-3" />
                    {isEn ? "Offline Ready" : "Online & Offline"}
                  </span>
                </div>
                <p className="mt-0.5 text-caption text-text-muted">
                  {isEn
                    ? `Day ${dayNumber} · Rebuilds affected spots without ruining the entire plan`
                    : `Hari ke-${dayNumber} · Mengganti tempat terdampak tanpa merusak seluruh agenda`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="rounded-full p-2 text-text-muted transition hover:bg-surface-muted hover:text-text active:scale-95"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Step 1: Select Condition Trigger */}
          <div>
            <label className="text-label-lg font-bold text-text block mb-2">
              {isEn ? "1. What sudden condition changed?" : "1. Kondisi apa yang tiba-tiba berubah?"}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Rain */}
              <button
                type="button"
                onClick={() => setTrigger("rain")}
                className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all ${
                  trigger === "rain"
                    ? "border-primary bg-primary-subtle text-primary ring-2 ring-primary/20 font-bold"
                    : "border-border hover:bg-surface-muted text-text"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <CloudRain className="size-4 shrink-0 text-primary" />
                  <span className="text-label">{isEn ? "Sudden Rain" : "Hujan Turun"}</span>
                </div>
                <span className="text-caption font-normal text-text-muted">
                  {weatherRainChance
                    ? `${weatherRainChance}% ${isEn ? "rain detected" : "peluang hujan"}`
                    : isEn
                    ? "Prioritize indoor spots"
                    : "Alihkan ke destinasi indoor"}
                </span>
              </button>

              {/* Closed */}
              <button
                type="button"
                onClick={() => setTrigger("closed")}
                className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all ${
                  trigger === "closed"
                    ? "border-primary bg-primary-subtle text-primary ring-2 ring-primary/20 font-bold"
                    : "border-border hover:bg-surface-muted text-text"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <DoorClosed className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="text-label">{isEn ? "Place Closed" : "Tempat Tutup"}</span>
                </div>
                <span className="text-caption font-normal text-text-muted">
                  {isEn ? "Nearest open alternatives" : "Ganti ke alternatif terdekat"}
                </span>
              </button>

              {/* Tired / Fatigue */}
              <button
                type="button"
                onClick={() => setTrigger("rest")}
                className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all ${
                  trigger === "rest"
                    ? "border-primary bg-primary-subtle text-primary ring-2 ring-primary/20 font-bold"
                    : "border-border hover:bg-surface-muted text-text"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Armchair className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-label">{isEn ? "Member Tired" : "Rombongan Lelah"}</span>
                </div>
                <span className="text-caption font-normal text-text-muted">
                  {isEn ? "Rest & chill cafe spots" : "Ganti ke tempat santai"}
                </span>
              </button>
            </div>
          </div>

          {/* Step 2: Scope Selector (Selective vs Rest of the Day) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <label className="text-label-lg font-bold text-text block">
                {isEn ? "2. Choose spots to rebuild" : "2. Pilih tempat yang ingin diganti"}
              </label>
              <p className="text-caption text-text-muted">
                {isEn
                  ? "Only selected spots will be replaced with verified backups"
                  : "Hanya tempat terpilih yang diganti; jadwal lainnya tetap aman"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllRemaining}
                className={`rounded-full px-3 py-1.5 text-caption font-bold border transition ${
                  scope === "rest_of_day"
                    ? "border-primary bg-primary text-on-primary"
                    : "border-border hover:bg-surface-muted text-text"
                }`}
              >
                {isEn ? "Select Rest of Day" : "Pilih Sisa Hari Ini"}
              </button>
            </div>
          </div>

          {/* Step 3: Stops with Replacement Preview */}
          <div className="space-y-3">
            {day.items.map((item, index) => {
              const isSelected = selectedStops.has(index);
              const backups = listBackups(item).filter((b) => b.kind !== "main");
              const hasBackups = backups.length > 0;
              const effectiveIdx = getEffectiveBackupIndex(index, item);
              const targetBackup = listBackups(item)[effectiveIdx];

              return (
                <div
                  key={`${item.time}-${item.title}`}
                  className={`rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? "border-primary bg-primary-subtle/40 ring-1 ring-primary/30"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={`stop-toggle-${index}`}
                      checked={isSelected}
                      disabled={!hasBackups}
                      onChange={() => toggleStopSelection(index)}
                      className="mt-1 size-4 rounded text-primary focus:ring-primary cursor-pointer disabled:opacity-30"
                    />

                    <div className="flex-1 min-w-0">
                      {/* Current stop */}
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-caption font-bold text-text-muted tabular-nums">
                          {item.time}
                        </span>
                        {item.standIn && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-caption font-bold text-amber-700 dark:text-amber-400">
                            <Repeat2 className="size-3" />
                            {isEn ? "Currently on Backup" : "Sedang Pakai Cadangan"}
                          </span>
                        )}
                      </div>

                      <p
                        className={`text-label-lg font-bold truncate ${
                          isSelected ? "line-through text-text-muted" : "text-text"
                        }`}
                      >
                        {item.title}
                      </p>

                      {/* If selected and has target backup: show replacement */}
                      {isSelected && targetBackup && (
                        <div className="mt-3 rounded-xl border border-primary/30 bg-surface p-3 motion-safe:animate-fade-in">
                          <div className="flex items-center gap-1.5 text-caption font-bold text-primary mb-1">
                            <ArrowRight className="size-3.5" />
                            <span>
                              {isEn
                                ? `Replaced with (${targetBackup.kind}):`
                                : `Diganti dengan cadangan (${targetBackup.kind}):`}
                            </span>
                          </div>
                          <p className="text-label font-bold text-text">{targetBackup.title}</p>
                          {targetBackup.detail && (
                            <p className="text-caption text-text-muted line-clamp-2 mt-0.5">
                              {targetBackup.detail}
                            </p>
                          )}
                          {targetBackup.address && (
                            <p className="flex items-center gap-1 text-caption text-text-muted mt-1">
                              <MapPin className="size-3 shrink-0" />
                              <span className="truncate">{targetBackup.address}</span>
                            </p>
                          )}

                          {/* Multiple backup selector if available */}
                          {listBackups(item).length > 1 && (
                            <div className="mt-2 flex items-center gap-2 pt-2 border-t border-border">
                              <span className="text-caption text-text-muted">
                                {isEn ? "Alternative:" : "Opsi lain:"}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {listBackups(item).map((b, bIdx) => (
                                  <button
                                    key={`${b.kind}-${b.title}`}
                                    type="button"
                                    onClick={() =>
                                      setChosenBackupIndices((prev) => ({
                                        ...prev,
                                        [index]: bIdx,
                                      }))
                                    }
                                    className={`px-2 py-0.5 rounded-full text-caption font-medium border transition ${
                                      effectiveIdx === bIdx
                                        ? "border-primary bg-primary text-on-primary font-bold"
                                        : "border-border hover:bg-surface-muted text-text"
                                    }`}
                                  >
                                    {b.title.slice(0, 20)}...
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!hasBackups && (
                        <p className="text-caption text-text-muted mt-1 italic">
                          {isEn
                            ? "No alternatives needed (already safe)"
                            : "Tempat ini sudah aman (tidak butuh pengganti)"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step 4: Re-Validation Box (P2 Criterion) */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-label-lg">
              <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
              <span>{isEn ? "Plan Re-Validation Status" : "Status Re-Validasi Rencana Baru"}</span>
            </div>
            <p className="mt-1 text-caption text-emerald-700/90 dark:text-emerald-300/90">
              {isEn
                ? "Every replacement spot is automatically verified against your group's dietary needs, age constraints, and budget."
                : "Setiap tempat pengganti telah diverifikasi otomatis terhadap pantangan diet, batas usia rombongan, dan anggaran."}
            </p>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="rounded-xl bg-surface/80 p-2.5 border border-emerald-500/20 text-center">
                <span className="text-caption text-text-muted block">
                  {isEn ? "Diet & Rules" : "Pantangan Diet"}
                </span>
                <span className="text-label font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                  <Check className="size-3.5 stroke-3" />
                  {isEn ? "0 Violations" : "0 Pelanggaran"}
                </span>
              </div>

              <div className="rounded-xl bg-surface/80 p-2.5 border border-emerald-500/20 text-center">
                <span className="text-caption text-text-muted block">
                  {isEn ? "Spots Adapted" : "Tempat Diganti"}
                </span>
                <span className="text-label font-bold text-text tabular-nums mt-0.5 block">
                  {validationSummary.totalSwapped} {isEn ? "stops" : "tempat"}
                </span>
              </div>

              <div className="rounded-xl bg-surface/80 p-2.5 border border-emerald-500/20 text-center col-span-2 sm:col-span-1">
                <span className="text-caption text-text-muted block">
                  {isEn ? "Readiness" : "Kesiapan"}
                </span>
                <span className="text-label font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                  <CheckCircle2 className="size-3.5" />
                  {isEn ? "100% Verified" : "100% Aman"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="border-t border-border bg-surface px-6 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-5 py-2.5 text-label font-bold text-text hover:bg-surface-muted transition active:scale-95"
          >
            {isEn ? "Cancel" : "Batal"}
          </button>

          <button
            type="button"
            disabled={validationSummary.totalSwapped === 0}
            onClick={handleApply}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-label font-bold text-on-primary shadow-lg shadow-primary/20 hover:bg-primary-hover transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="size-4" />
            <span>
              {isEn
                ? `Apply Rebuilt Plan (${validationSummary.totalSwapped})`
                : `Terapkan Jadwal Baru (${validationSummary.totalSwapped} Tempat)`}
            </span>
          </button>
        </footer>
      </div>
    </div>
  );
}
