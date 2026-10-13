"use client";

import {
  ArrowLeft,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Cloud,
  Compass,
  Copy,
  DollarSign,
  Download,
  Eye,
  Filter,
  Heart,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  Route,
  Share2,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import PageBackdrop from "@/components/layout/PageBackdrop";
import { trips, TripsError } from "@/lib/api/trips";
import { formatDays, formatMoney, formatTripDates } from "@/lib/trips/format";
import type { TripPlanView } from "@/lib/trips/trip";
import { useLocale } from "@/lib/use-locale";
import { useMessages } from "@/lib/use-messages";

type TripSummaryClientProps = {
  tripId: string;
};

type MemoryMoment = {
  id: string;
  tripId?: string;
  userId?: string;
  authorName?: string;
  placeTitle: string;
  dayNumber: number;
  note: string;
  photoKey?: string;
  photoUrl?: string;
  rating: number;
  createdAt: string;
};

const MEMORIES_KEY_PREFIX = "kancara-trip-memories:";

export default function TripSummaryClient({ tripId }: TripSummaryClientProps) {
  const locale = useLocale();
  const isEn = locale === "en";
  const tripsText = useMessages("trips");

  const [plan, setPlan] = useState<TripPlanView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: relive | moments
  const [activeTab, setActiveTab] = useState<"relive" | "moments">("relive");

  // Share & Modal states
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Moments / Memories state
  const [memories, setMemories] = useState<MemoryMoment[]>([]);
  const [showAddMoment, setShowAddMoment] = useState(false);
  const [momentPlace, setMomentPlace] = useState("");
  const [momentDay, setMomentDay] = useState(1);
  const [momentNote, setMomentNote] = useState("");
  const [momentAuthor, setMomentAuthor] = useState("");
  const [momentPhoto, setMomentPhoto] = useState<string | null>(null);
  const [momentPhotoFile, setMomentPhotoFile] = useState<File | null>(null);
  const [momentRating, setMomentRating] = useState(5);
  const [isUploadingMoment, setIsUploadingMoment] = useState(false);
  const [uploadMomentError, setUploadMomentError] = useState<string | null>(null);
  const [selectedAuthorFilter, setSelectedAuthorFilter] = useState<string>("all");

  // Load trip plan
  useEffect(() => {
    const controller = new AbortController();
    trips
      .plan(tripId, controller.signal)
      .then((data) => {
        setPlan(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof TripsError && err.status === 404 ? "not_found" : "failed");
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [tripId]);

  // Load saved data from localStorage first (instant offline cache)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MEMORIES_KEY_PREFIX + tripId);
      if (raw) setMemories(JSON.parse(raw));
    } catch {}
  }, [tripId]);

  // Sync latest memories from Neon Postgres & Cloud Storage API
  useEffect(() => {
    fetch(`/api/trips/${tripId}/memories`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.memories) && data.memories.length > 0) {
          setMemories(data.memories);
          localStorage.setItem(MEMORIES_KEY_PREFIX + tripId, JSON.stringify(data.memories));
        }
      })
      .catch(() => {
        // Fallback to local storage cache if offline
      });
  }, [tripId]);

  const saveMemoriesToStorage = (updated: MemoryMoment[]) => {
    setMemories(updated);
    try {
      localStorage.setItem(MEMORIES_KEY_PREFIX + tripId, JSON.stringify(updated));
    } catch {}
  };

  // Add new moment with Neon Object Storage S3 upload
  const handleAddMoment = async () => {
    if (!momentPlace.trim()) return;
    setIsUploadingMoment(true);
    setUploadMomentError(null);

    try {
      const formData = new FormData();
      formData.append("placeTitle", momentPlace.trim());
      formData.append("dayNumber", String(momentDay));
      formData.append("note", momentNote.trim());
      formData.append("rating", String(momentRating));
      if (momentAuthor.trim()) {
        formData.append("authorName", momentAuthor.trim());
      } else if (plan?.draft.members && plan.draft.members[0]) {
        formData.append("authorName", plan.draft.members[0].name);
      }
      if (momentPhotoFile) {
        formData.append("photo", momentPhotoFile);
      }

      const res = await fetch(`/api/trips/${tripId}/memories`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal menyimpan momen ke Cloud Storage");
      }

      const newMoment: MemoryMoment = await res.json();
      saveMemoriesToStorage([newMoment, ...memories]);

      setMomentPlace("");
      setMomentNote("");
      setMomentAuthor("");
      setMomentPhoto(null);
      setMomentPhotoFile(null);
      setMomentRating(5);
      setShowAddMoment(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah foto ke Cloud Storage";
      setUploadMomentError(msg);
    } finally {
      setIsUploadingMoment(false);
    }
  };

  const handleDeleteMoment = async (id: string) => {
    saveMemoriesToStorage(memories.filter((m) => m.id !== id));
    try {
      await fetch(`/api/trips/${tripId}/memories?memoryId=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch {}
  };

  // Photo file picker
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMomentPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setMomentPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };



  if (loading) {
    return (
      <main className="relative isolate mx-auto w-full max-w-4xl flex-1 px-4 pt-28 pb-16 sm:px-6">
        <PageBackdrop />
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-64 rounded-full bg-surface-muted" />
          <div className="h-24 w-full rounded-3xl bg-surface-muted" />
          <div className="h-64 w-full rounded-3xl bg-surface-muted" />
        </div>
      </main>
    );
  }

  if (error || !plan) {
    return (
      <main className="relative isolate mx-auto w-full max-w-2xl flex-1 px-4 pt-28 pb-16 sm:px-6 text-center">
        <PageBackdrop />
        <h1 className="text-h3 font-heading text-text">
          {isEn ? "Trip summary not found" : "Ringkasan perjalanan tidak ditemukan"}
        </h1>
        <p className="mt-2 text-body text-text-muted">
          {isEn ? "The requested trip could not be loaded." : "Data perjalanan belum tersedia atau telah dihapus."}
        </p>
        <Link
          href="/trips"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-label font-bold text-on-primary shadow-md"
        >
          <ArrowLeft className="size-4" />
          {isEn ? "Back to My Trips" : "Kembali ke Perjalanan Saya"}
        </Link>
      </main>
    );
  }

  const { card, draft, itinerary } = plan;
  const destination = card.destinations.join(", ") || card.name;
  const tripDaysCount = card.days || (itinerary?.days?.length ?? 1);
  const totalPlacesVisited = itinerary?.days?.reduce((sum, d) => sum + (d.items?.length ?? 0), 0) ?? 0;

  // Member names
  const memberNames =
    draft.members.length > 0
      ? draft.members.map((m) => m.name || `Anggota ${m.id}`)
      : [isEn ? "Me" : "Saya"];



  // Format WhatsApp Share text
  const shareText = `✨ *Kancara Trip Recap: ${card.name}* ✨\n` +
    `📍 Destinasi: ${destination}\n` +
    `🗓️ Durasi: ${card.startDate ? formatTripDates(card.startDate, card.endDate, locale) : `${tripDaysCount} Hari`}\n` +
    `👥 Rombongan: ${memberNames.join(", ")}\n` +
    `🏆 ${totalPlacesVisited} tempat wisata berhasil dikunjungi bersama!\n\n` +
    `Buka album kenangan lengkap perjalanan kita di Kancara:\n` +
    `${typeof window !== "undefined" ? window.location.href : ""}`;

  const handleCopyShare = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  return (
    <main className="relative isolate mx-auto w-full max-w-4xl flex-1 px-4 pt-24 pb-20 sm:px-6 sm:pt-28">
      <PageBackdrop />

      {/* Top Breadcrumb */}
      <Link
        href="/trips"
        className="group inline-flex min-h-11 items-center gap-2 rounded-sm text-label text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4 transition-[translate] duration-200 ease-out group-hover:-translate-x-1" />
        {tripsText.placeholder.back}
      </Link>

      {/* Hero Badge & Title */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
          <Trophy className="size-4 text-emerald-600 dark:text-emerald-400" />
          {isEn ? "Trip Completed · After the Trip Recap" : "Perjalanan Selesai · Ringkasan Kenangan"}
        </span>

        {/* Action Share Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-caption font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <MessageCircle className="size-4" />
            {isEn ? "Share to WhatsApp" : "Bagikan ke WhatsApp"}
          </button>
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface hover:bg-surface-muted px-4 py-2 text-caption font-bold text-text transition-all active:scale-95"
          >
            <Share2 className="size-4 text-text-muted" />
            {isEn ? "Card Preview" : "Kartu Ringkasan"}
          </button>
          <Link
            href="/plan"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary px-4 py-2 text-caption font-bold shadow-md shadow-primary/20 transition-all active:scale-95"
          >
            <Sparkles className="size-4" />
            {isEn ? "Next Adventure" : "Trip Berikutnya"}
          </Link>
        </div>
      </div>

      <h1 className="mt-3 text-h2 font-heading font-extrabold text-text sm:text-h1">
        {card.name}
      </h1>
      <p className="mt-1 flex items-center gap-2 text-body font-medium text-text-muted">
        <MapPin className="size-4 text-primary shrink-0" />
        {destination} · {card.startDate ? formatTripDates(card.startDate, card.endDate, locale) : `${tripDaysCount} Hari`}
      </p>

      {/* Bento Stats Highlight */}
      <section className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <span className="text-caption font-semibold text-text-muted block">
            {isEn ? "Places Visited" : "Tempat Dikunjungi"}
          </span>
          <span className="mt-1 flex items-baseline gap-1 font-heading text-h3 font-black text-text tabular-nums">
            {totalPlacesVisited}
            <span className="text-caption font-normal text-text-muted">{isEn ? "stops" : "lokasi"}</span>
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <span className="text-caption font-semibold text-text-muted block">
            {isEn ? "Trip Duration" : "Durasi Perjalanan"}
          </span>
          <span className="mt-1 flex items-baseline gap-1 font-heading text-h3 font-black text-text tabular-nums">
            {tripDaysCount}
            <span className="text-caption font-normal text-text-muted">{isEn ? "days" : "hari"}</span>
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <span className="text-caption font-semibold text-text-muted block">
            {isEn ? "Group Members" : "Anggota Rombongan"}
          </span>
          <span className="mt-1 flex items-baseline gap-1 font-heading text-h3 font-black text-text tabular-nums">
            {memberNames.length}
            <span className="text-caption font-normal text-text-muted">{isEn ? "people" : "orang"}</span>
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <span className="text-caption font-semibold text-text-muted block">
            {isEn ? "Estimated Cost" : "Estimasi Biaya"}
          </span>
          <span className="mt-1 flex items-baseline gap-1 font-heading text-h3 font-black text-text tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatMoney(card.cost?.spent || card.cost?.budget || card.budget || 0, locale)}
          </span>
        </div>
      </section>

      {/* Segment Navigation Bar */}
      <div className="mt-8 flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("relive")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-label font-bold transition-all cursor-pointer ${
            activeTab === "relive"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <Route className="size-4" />
          {isEn ? "Route Relive" : "Kilas Balik Rute"}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("moments")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-label font-bold transition-all cursor-pointer ${
            activeTab === "moments"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <Camera className="size-4" />
          {isEn ? "Moments & Notes" : "Momen & Catatan"}
          {memories.length > 0 && (
            <span className="rounded-full bg-primary-subtle text-primary px-2 py-0.5 text-xs font-bold">
              {memories.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Route Relive */}
      {activeTab === "relive" && (
        <section className="mt-6 space-y-6">
          {itinerary && itinerary.days && itinerary.days.length > 0 ? (
            itinerary.days.map((day, idx) => (
              <div key={idx} className="rounded-3xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary text-on-primary text-caption font-bold">
                      {idx + 1}
                    </span>
                    <h3 className="font-heading text-h4 font-bold text-text">
                      {day.date ? formatTripDates(day.date, day.date, locale) : `Hari ke-${idx + 1}`}
                    </h3>
                  </div>
                  <span className="text-caption font-semibold text-text-muted">
                    {day.items.length} {isEn ? "Stops" : "Destinasi"}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {day.items.map((item, iIdx) => (
                    <div
                      key={iIdx}
                      className="flex items-start justify-between gap-3 rounded-2xl bg-surface-muted/50 p-3.5 transition-colors hover:bg-surface-muted"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-heading text-body font-bold text-text truncate">
                            {item.title}
                          </p>
                          {(item.address || item.detail) && (
                            <p className="text-caption text-text-muted truncate mt-0.5">
                              {item.address || item.detail}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-caption font-bold text-text-muted shrink-0">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center">
              <Compass className="size-8 text-text-muted mx-auto mb-2" />
              <p className="font-heading text-body font-bold text-text">
                {isEn ? "No route itinerary recorded" : "Belum ada rute tersimpan untuk perjalanan ini"}
              </p>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: Moments & Notes Album */}
      {activeTab === "moments" && (
        <section className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-body-sm text-text-muted">
              {isEn
                ? "Collect favorite memories, restaurant reviews, and photos from this trip."
                : "Kumpulkan momen favorit, catatan rasa kuliner, dan foto terbaik dari perjalanan ini."}
            </p>
            <button
              type="button"
              onClick={() => setShowAddMoment(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary px-4 py-2 text-caption font-bold shadow-md transition-all active:scale-95"
            >
              <Plus className="size-4" />
              {isEn ? "Add Memory" : "Tambah Momen"}
            </button>
          </div>

          {/* Add Moment Form Modal/Card */}
          {showAddMoment && (
            <div className="rounded-3xl border-2 border-primary/40 bg-surface p-5 sm:p-6 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="font-heading text-h4 font-bold text-text">
                  {isEn ? "Record a New Memory" : "Catat Momen Kenangan Baru"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddMoment(false)}
                  className="p-1 text-text-muted hover:text-text cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-caption font-bold text-text-muted mb-1">
                    {isEn ? "Place / Destination Name" : "Nama Tempat / Destinasi"}
                  </label>
                  <input
                    type="text"
                    value={momentPlace}
                    onChange={(e) => setMomentPlace(e.target.value)}
                    placeholder={isEn ? "e.g. Sensoji Temple / Ichiran Ramen" : "contoh: Candi Borobudur / Warung Nasi Pedas"}
                    className="w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-body font-medium text-text outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-caption font-bold text-text-muted mb-1">
                      {isEn ? "Day" : "Hari ke-"}
                    </label>
                    <select
                      value={momentDay}
                      onChange={(e) => setMomentDay(Number(e.target.value))}
                      className="w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-body font-medium text-text outline-none cursor-pointer"
                    >
                      {Array.from({ length: tripDaysCount }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {isEn ? `Day ${i + 1}` : `Hari ke-${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-caption font-bold text-text-muted mb-1">
                      {isEn ? "Rating" : "Penilaian"}
                    </label>
                    <div className="flex items-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setMomentRating(star)}
                          className="cursor-pointer"
                        >
                          <Star
                            className={`size-5 ${
                              star <= momentRating
                                ? "fill-amber-400 text-amber-400"
                                : "text-border stroke-text-muted"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-caption font-bold text-text-muted mb-1">
                    {isEn ? "Personal Note / Tip for Next Time" : "Catatan Kenangan / Tips"}
                  </label>
                  <textarea
                    rows={2}
                    value={momentNote}
                    onChange={(e) => setMomentNote(e.target.value)}
                    placeholder={isEn ? "What was unforgettable about this spot?" : "Apa yang paling berkesan di tempat ini?"}
                    className="w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-body font-medium text-text outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-caption font-bold text-text-muted mb-1">
                    {isEn ? "Uploaded By (Member)" : "Diunggah Oleh (Anggota Rombongan)"}
                  </label>
                  <select
                    value={momentAuthor}
                    onChange={(e) => setMomentAuthor(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-body font-medium text-text outline-none cursor-pointer"
                  >
                    <option value="">{isEn ? "Me (Current User)" : "Saya (Pengguna Saat Ini)"}</option>
                    {plan?.draft.members.map((mem) => (
                      <option key={mem.id} value={mem.name}>
                        {mem.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-caption font-bold text-text-muted mb-1">
                    {isEn ? "Photo (Stored securely in Cloud Storage)" : "Unggah Foto (Tersimpan di Cloud Storage)"}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-caption text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-surface-muted file:text-caption file:font-bold file:text-text cursor-pointer"
                  />
                  {momentPhoto && (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="relative w-28 h-20 rounded-xl overflow-hidden border border-border shadow-sm">
                        <img src={momentPhoto} alt="preview" className="size-full object-cover" />
                      </div>
                      <span className="text-caption text-text-muted font-medium">
                        {momentPhotoFile?.name} ({(Number(momentPhotoFile?.size || 0) / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                  )}
                </div>

                {uploadMomentError && (
                  <p className="text-caption font-bold text-error bg-error/10 rounded-xl px-3 py-2">
                    {uploadMomentError}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMoment(false)}
                    className="rounded-xl border border-border px-4 py-2 text-caption font-bold text-text cursor-pointer hover:bg-surface-muted"
                  >
                    {isEn ? "Cancel" : "Batal"}
                  </button>
                  <button
                    type="button"
                    disabled={isUploadingMoment}
                    onClick={handleAddMoment}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-caption font-bold text-on-primary cursor-pointer hover:bg-primary-hover shadow-md disabled:opacity-50"
                  >
                    {isUploadingMoment ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {isEn ? "Saving to Cloud Storage..." : "Menyimpan ke Cloud Storage..."}
                      </>
                    ) : (
                      isEn ? "Save Memory" : "Simpan Momen"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Member Filter Chips Bar */}
          {memories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
              <span className="text-caption font-bold text-text-muted flex items-center gap-1.5 mr-1">
                <Filter className="size-3.5" />
                {isEn ? "Filter by member:" : "Filter foto per orang:"}
              </span>
              <button
                type="button"
                onClick={() => setSelectedAuthorFilter("all")}
                className={`rounded-full px-3 py-1 text-caption font-bold transition-all cursor-pointer ${
                  selectedAuthorFilter === "all"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "border border-border bg-surface text-text hover:bg-surface-muted"
                }`}
              >
                {isEn ? `All (${memories.length})` : `Semua (${memories.length})`}
              </button>
              {Array.from(new Set(memories.map((m) => m.authorName || "Member"))).map((author) => {
                const count = memories.filter((m) => (m.authorName || "Member") === author).length;
                return (
                  <button
                    key={author}
                    type="button"
                    onClick={() => setSelectedAuthorFilter(author)}
                    className={`rounded-full px-3 py-1 text-caption font-bold transition-all cursor-pointer ${
                      selectedAuthorFilter === author
                        ? "bg-primary text-on-primary shadow-sm"
                        : "border border-border bg-surface text-text hover:bg-surface-muted"
                    }`}
                  >
                    👤 {author} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* List of Moments */}
          {memories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {memories
                .filter((m) =>
                  selectedAuthorFilter === "all" ? true : (m.authorName || "Member") === selectedAuthorFilter,
                )
                .map((m) => (
                  <div
                    key={m.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-surface shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                  >
                    {m.photoUrl && (
                      <div className="h-44 w-full overflow-hidden bg-surface-muted">
                        <img
                          src={m.photoUrl}
                          alt={m.placeTitle}
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="rounded-full bg-primary-subtle text-primary px-2.5 py-0.5 text-[11px] font-bold">
                              {isEn ? `Day ${m.dayNumber}` : `Hari ke-${m.dayNumber}`}
                            </span>
                            <span className="rounded-full bg-surface-muted border border-border/80 text-text px-2 py-0.5 text-[10px] font-bold">
                              👤 {m.authorName || "Member"}
                            </span>
                            {(m.photoKey || m.photoUrl?.includes("photo?key=")) && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-[10px] font-bold">
                                <Cloud className="size-3" />
                                Cloud Storage
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: m.rating }).map((_, i) => (
                              <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>
                        <h4 className="mt-2.5 font-heading text-h4 font-bold text-text">
                          {m.placeTitle}
                        </h4>
                        {m.note && (
                          <p className="mt-1 text-body-sm text-text-muted italic">
                            "{m.note}"
                          </p>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-text-muted">
                        <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteMoment(m.id)}
                          className="text-error hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="size-3" />
                          {isEn ? "Delete" : "Hapus"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center">
              <Camera className="size-8 text-text-muted mx-auto mb-2" />
              <p className="font-heading text-body font-bold text-text">
                {isEn ? "No photo moments attached yet" : "Belum ada foto atau momen yang dicatat"}
              </p>
              <p className="mt-1 text-caption text-text-muted">
                {isEn ? "Tap 'Add Memory' above to attach your trip highlights!" : "Klik 'Tambah Momen' di atas untuk mengabadikan foto dan catatan terbaik!"}
              </p>
            </div>
          )}
        </section>
      )}



      {/* Share Card Modal */}
      {showShareModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-950/70 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-text-muted hover:text-text cursor-pointer"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <Trophy className="size-5" />
              <span className="font-heading text-caption font-bold uppercase tracking-wider">
                Kancara Memory Pass
              </span>
            </div>
            <h3 className="font-heading text-h3 font-black text-text">
              {card.name}
            </h3>
            <p className="text-caption text-text-muted mt-0.5">
              {destination} · {tripDaysCount} {isEn ? "Days" : "Hari"}
            </p>

            <div className="my-5 rounded-2xl border border-border/80 bg-surface-muted p-4 space-y-2">
              <div className="flex justify-between text-body-sm font-medium">
                <span className="text-text-muted">{isEn ? "Total Stops" : "Total Lokasi"}:</span>
                <span className="font-bold text-text">{totalPlacesVisited}</span>
              </div>
              <div className="flex justify-between text-body-sm font-medium">
                <span className="text-text-muted">{isEn ? "Group Members" : "Rombongan"}:</span>
                <span className="font-bold text-text">{memberNames.join(", ")}</span>
              </div>
              <div className="flex justify-between text-body-sm font-medium">
                <span className="text-text-muted">{isEn ? "Total Budget" : "Total Biaya"}:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatMoney(card.cost?.spent || card.cost?.budget || card.budget || 0, locale)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCopyShare}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary hover:bg-primary-hover text-on-primary py-3 text-label font-bold shadow-md transition-all active:scale-95"
              >
                {copiedShare ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copiedShare
                  ? (isEn ? "Text Copied!" : "Teks WhatsApp Tersalin!")
                  : (isEn ? "Copy WhatsApp Text" : "Salin Teks WhatsApp")}
              </button>
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 py-3 text-label font-bold transition-all active:scale-95"
              >
                <MessageCircle className="size-4" />
                {isEn ? "Open WhatsApp App" : "Buka Aplikasi WhatsApp"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
