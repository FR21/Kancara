"use client";

import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Compass,
  FileQuestion,
  HelpCircle,
  Loader2,
  Sparkles,
  TriangleAlert,
  Upload,
  Volume2,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import PageBackdrop from "@/components/layout/PageBackdrop";
import FieldPassModal from "./FieldPassModal";
import type { DietaryAnalysisResult, MemberDietCheck } from "@/lib/agents/dietaryAgent";
import { useLocale } from "@/lib/use-locale";

type DietaryScannerClientProps = {
  tripId: string;
  tripName: string;
  destination: string;
  members: Array<{ id: string; name: string; allergies: string; needs: string[] }>;
};

export default function DietaryScannerClient({
  tripId,
  tripName,
  destination,
  members,
}: DietaryScannerClientProps) {
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DietaryAnalysisResult | null>(null);
  const [speakingKey, setSpeakingKey] = useState<"native" | "translation" | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showFieldPass, setShowFieldPass] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const isEn = locale === "en";

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Bersihkan track kamera saat komponen di-unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Pasang stream ke elemen video segera setelah videoRef terpasang
  useEffect(() => {
    if (isCameraActive && videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch((err) => {
        console.warn("Video stream play failed:", err);
      });
    }
  }, [isCameraActive]);

  const startCamera = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Fallback ke input capture jika browser tidak mendukung mediaDevices
        cameraInputRef.current?.click();
        return;
      }

      // Utamakan kamera belakang (environment) di ponsel, atau webcam di laptop
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });

      mediaStreamRef.current = stream;
      setIsCameraActive(true);
      setPreviewUrl(null);
      setSelectedFile(null);
    } catch (err: any) {
      console.warn("Direct camera access failed, falling back to native file input:", err);
      cameraInputRef.current?.click();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "camera-menu-capture.jpg", { type: "image/jpeg" });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setResult(null);
        setError(null);
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopCamera();
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("tripId", tripId);
      formData.append("image", selectedFile);
      formData.append("locale", locale);

      const res = await fetch("/api/dietary-scan", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal menganalisis menu makanan.");
      }

      const data: DietaryAnalysisResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat pemindaian.");
    } finally {
      setAnalyzing(false);
    }
  };

  const playTTS = (
    textToSpeak: string,
    languageTag: string,
    key: "native" | "translation" = "native"
  ) => {
    if (!("speechSynthesis" in window)) {
      alert("Text-to-speech tidak didukung di browser ini.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Deteksi kode bahasa untuk Web Speech API
    const langLower = languageTag.toLowerCase();
    if (langLower.includes("indonesia") || langLower.includes("id")) {
      utterance.lang = "id-ID";
    } else if (langLower.includes("japan") || langLower.includes("nihon") || langLower.includes("ja")) {
      utterance.lang = "ja-JP";
    } else if (langLower.includes("korea") || langLower.includes("ko")) {
      utterance.lang = "ko-KR";
    } else if (langLower.includes("thai") || langLower.includes("th")) {
      utterance.lang = "th-TH";
    } else if (langLower.includes("chine") || langLower.includes("mandarin") || langLower.includes("zh")) {
      utterance.lang = "zh-CN";
    } else if (langLower.includes("french") || langLower.includes("fr")) {
      utterance.lang = "fr-FR";
    } else if (langLower.includes("german") || langLower.includes("de")) {
      utterance.lang = "de-DE";
    } else if (langLower.includes("spanish") || langLower.includes("es")) {
      utterance.lang = "es-ES";
    } else if (langLower.includes("italian") || langLower.includes("it")) {
      utterance.lang = "it-IT";
    } else if (langLower.includes("vietnam") || langLower.includes("vi")) {
      utterance.lang = "vi-VN";
    } else if (langLower.includes("arab") || langLower.includes("ar")) {
      utterance.lang = "ar-SA";
    } else if (langLower.includes("malay") || langLower.includes("ms")) {
      utterance.lang = "ms-MY";
    } else {
      utterance.lang = "en-US";
    }

    try {
      const voices = window.speechSynthesis.getVoices();
      const prefix = utterance.lang.slice(0, 2).toLowerCase();
      const match = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
      if (match) {
        utterance.voice = match;
      }
    } catch {}

    utterance.rate = 0.9; // Sedikit lebih lambat agar artikulasi jelas
    utterance.onstart = () => setSpeakingKey(key);
    utterance.onend = () => setSpeakingKey(null);
    utterance.onerror = () => setSpeakingKey(null);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <main className="relative isolate mx-auto w-full max-w-4xl flex-1 px-4 pt-24 pb-16 sm:px-6 sm:pt-28">
      <PageBackdrop />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/trips/${encodeURIComponent(tripId)}`}
          className="group inline-flex min-h-11 items-center gap-2 rounded-sm text-label text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4 transition-[translate] duration-200 ease-out group-hover:-translate-x-1" />
          {isEn ? "Back to Trip" : "Kembali ke Perjalanan"}
        </Link>

        <button
          type="button"
          onClick={() => setShowFieldPass(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1.5 text-caption font-bold text-emerald-800 dark:text-emerald-300 shadow-sm transition-all hover:bg-emerald-500/20 active:scale-95"
        >
          <Compass className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          {isEn ? "Field Pass (Offline)" : "Paspor Lapangan 🟢"}
        </button>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-h2 text-text sm:text-h1">
              {isEn ? "Dietary Lens & Waiter Speak" : "Pemindai Menu & Pantangan Makanan"}
            </h1>
            <p className="mt-1 text-body text-text-muted">
              {isEn
                ? `Scan foreign menus or food packaging in ${destination || tripName}. We'll evaluate ingredients against your group's diets and give you audio phrases for the waiter.`
                : `Pindai foto menu atau label makanan di ${destination || tripName}. AI mendeteksi komposisi, mencocokkannya dengan anggota rombongan, dan menyiapkan audio bahasa lokal untuk pelayan.`}
            </p>
          </div>
        </div>

        {/* Member Diet Constraints Pill Strip */}
        {members.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
            <span className="text-caption font-bold text-text-muted">
              {isEn ? "Group constraints:" : "Pantangan rombongan:"}
            </span>
            {members.map((m) => {
              const restrictions = [
                ...m.needs.filter((n) => ["halal", "vegetarian", "vegan"].includes(n)),
                m.allergies ? `Alergi: ${m.allergies}` : null,
              ].filter(Boolean);

              if (restrictions.length === 0) return null;

              return (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface-muted px-2.5 py-1 text-caption text-text"
                >
                  <span className="font-bold">{m.name}:</span> {restrictions.join(", ")}
                </span>
              );
            })}
          </div>
        )}

        {/* Input Box: Upload or Capture */}
        <div className="mt-6 rounded-3xl border border-border bg-surface p-5 sm:p-6">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <canvas ref={canvasRef} className="hidden" />

          {isCameraActive ? (
            <div className="relative flex flex-col items-center overflow-hidden rounded-2xl bg-black p-3 sm:p-4">
              <div className="relative w-full overflow-hidden rounded-xl bg-black flex items-center justify-center min-h-[300px] max-h-[500px]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-h-[480px] rounded-xl object-contain"
                />

                {/* Viewfinder scan frame overlay */}
                <div className="pointer-events-none absolute inset-4 sm:inset-8 rounded-xl border-2 border-dashed border-white/40" />

                {/* Status indicator */}
                <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-caption font-semibold text-white backdrop-blur">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  {isEn ? "Live Camera" : "Kamera Aktif"}
                </div>

                {/* Close camera button */}
                <button
                  type="button"
                  onClick={stopCamera}
                  className="absolute top-3 right-3 flex size-9 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/90 active:scale-95"
                  aria-label={isEn ? "Close camera" : "Tutup kamera"}
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Shutter controls */}
              <div className="mt-4 flex w-full max-w-sm items-center justify-between px-6 py-2">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="cursor-pointer text-label font-medium text-white/80 transition hover:text-white"
                >
                  {isEn ? "Cancel" : "Batal"}
                </button>

                <button
                  type="button"
                  onClick={capturePhoto}
                  className="group relative flex size-18 cursor-pointer items-center justify-center rounded-full border-4 border-white/90 bg-white/20 p-1 shadow-lg transition hover:scale-105 active:scale-90"
                  aria-label={isEn ? "Capture photo" : "Jepret foto"}
                >
                  <div className="size-13 rounded-full bg-white transition group-hover:bg-primary" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    fileInputRef.current?.click();
                  }}
                  className="cursor-pointer text-label font-medium text-white/80 transition hover:text-white"
                >
                  {isEn ? "Gallery" : "Galeri"}
                </button>
              </div>

              <p className="mt-2 text-caption text-white/60">
                {isEn
                  ? "Align menu text within the frame, then press the white button"
                  : "Arahkan teks menu di dalam kotak, lalu tekan tombol putih"}
              </p>
            </div>
          ) : !previewUrl ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-strong px-6 py-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary-subtle text-primary">
                <Camera className="size-7" />
              </div>
              <p className="mt-4 text-label-lg text-text">
                {isEn ? "Take a photo or upload menu" : "Ambil foto atau unggah foto menu makanan"}
              </p>
              <p className="mt-1 max-w-sm text-body-sm text-text-muted">
                {isEn
                  ? "Point your camera clearly at the dish title, ingredients list, or food packaging label."
                  : "Arahkan kamera ke nama hidangan, daftar komposisi bahan, atau label kemasan makanan."}
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-label font-bold text-on-primary transition hover:bg-primary-hover active:scale-95"
                >
                  <Camera className="size-4" />
                  {isEn ? "Open Camera" : "Buka Kamera"}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-border-strong px-5 text-label font-bold text-text transition hover:bg-surface-muted active:scale-95"
                >
                  <Upload className="size-4" />
                  {isEn ? "Upload Photo" : "Pilih dari Galeri"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="relative overflow-clip rounded-2xl border border-border bg-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Menu preview" className="max-h-96 w-full object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(null);
                      setSelectedFile(null);
                      setResult(null);
                    }}
                    className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1.5 text-caption font-bold text-white backdrop-blur transition hover:bg-black/80"
                  >
                    {isEn ? "Retake" : "Ganti Foto"}
                  </button>
                </div>

                <div className="flex flex-col justify-center">
                  <h3 className="text-h3 text-text">
                    {isEn ? "Ready to inspect" : "Foto siap dianalisis"}
                  </h3>
                  <p className="mt-2 text-body-sm text-text-muted">
                    {isEn
                      ? "AI Vision will translate foreign characters, extract subtle ingredients (e.g. mirin, lard, alcohol, dashi, nuts), and check safety for each person."
                      : "AI Vision akan membaca aksara asing, mengekstrak bahan tersembunyi (mirin, lemak babi, dashi, alkohol, kacang), serta memeriksa kecocokan tiap anggota rombongan."}
                  </p>

                  <button
                    type="button"
                    disabled={analyzing}
                    onClick={handleAnalyze}
                    className="mt-6 inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 text-label-lg font-bold text-on-primary shadow-lg shadow-primary/25 transition hover:bg-primary-hover active:scale-95 disabled:opacity-50"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="size-5 animate-spin" />
                        {isEn ? "Analyzing ingredients..." : "Membaca & menganalisis..."}
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-5" />
                        {isEn ? "Scan for Dietary Restrictions" : "Periksa Komposisi & Pantangan"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-error/20 bg-error-subtle p-4 text-body-sm text-error">
              <TriangleAlert className="size-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results Display */}
        {result && (
          <div className="mt-8 space-y-6 motion-safe:animate-message-in">
            {/* Top Summary Card */}
            <div
              className={`rounded-3xl border p-5 sm:p-6 ${
                result.overallSuitability === "safe"
                  ? "border-success/30 bg-success-subtle/30"
                  : result.overallSuitability === "warning"
                    ? "border-warning/30 bg-warning-subtle/30"
                    : "border-error/30 bg-error-subtle/30"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-caption font-bold uppercase tracking-wider text-text-muted">
                    {result.originalLanguage}
                  </span>
                  <h2 className="text-h2 text-text">{result.dishOrItemName}</h2>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-label font-bold">
                  {result.overallSuitability === "safe" && (
                    <>
                      <CheckCircle2 className="size-5 text-success" />
                      <span className="text-success">{isEn ? "Safe to Eat" : "Aman Dikonsumsi"}</span>
                    </>
                  )}
                  {result.overallSuitability === "warning" && (
                    <>
                      <HelpCircle className="size-5 text-warning" />
                      <span className="text-warning">{isEn ? "Needs Confirmation" : "Perlu Konfirmasi"}</span>
                    </>
                  )}
                  {result.overallSuitability === "danger" && (
                    <>
                      <XCircle className="size-5 text-error" />
                      <span className="text-error">{isEn ? "Not Suitable" : "Mengandung Pantangan"}</span>
                    </>
                  )}
                </div>
              </div>

              <p className="mt-3 text-body text-text">{result.summary}</p>

              {/* Detected Ingredients */}
              <div className="mt-4 pt-4 border-t border-border/50">
                <span className="text-caption font-bold text-text-muted">
                  {isEn ? "Detected Ingredients:" : "Bahan Terdeteksi:"}
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {result.detectedIngredients.map((ing, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-border bg-background px-2.5 py-1 text-caption font-medium text-text"
                    >
                      {ing}
                    </span>
                  ))}
                  {result.hiddenOrDoubtfulIngredients?.map((ing, i) => (
                    <span
                      key={`doubt-${i}`}
                      className="rounded-lg border border-warning/40 bg-warning-subtle px-2.5 py-1 text-caption font-bold text-on-warning-subtle"
                    >
                      ⚠️ {ing}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Member-by-Member Breakdown */}
            <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
              <h3 className="text-h3 text-text">
                {isEn ? "Suitability for Each Member" : "Kesesuaian untuk Setiap Anggota"}
              </h3>
              <div className="mt-4 divide-y divide-border">
                {result.memberChecks.map((check) => (
                  <div key={check.memberId} className="flex items-start justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-label-lg font-bold text-text">{check.memberName}</p>
                      <p className="mt-0.5 text-body-sm text-text-muted">{check.reason}</p>
                    </div>

                    <div className="shrink-0">
                      {check.status === "safe" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success-subtle px-2.5 py-1 text-caption font-bold text-on-success-subtle">
                          <CheckCircle2 className="size-3.5" />
                          {isEn ? "Safe" : "Aman"}
                        </span>
                      )}
                      {check.status === "warning" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning-subtle px-2.5 py-1 text-caption font-bold text-on-warning-subtle">
                          <HelpCircle className="size-3.5" />
                          {isEn ? "Ask Staff" : "Tanya Pelayan"}
                        </span>
                      )}
                      {check.status === "danger" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-error-subtle px-2.5 py-1 text-caption font-bold text-on-error-subtle">
                          <XCircle className="size-3.5" />
                          {isEn ? "Avoid" : "Hindari"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Waiter Speak & Audio Card */}
            {result.waiterInquiry && (
              <div className="rounded-3xl border-2 border-primary bg-primary-subtle/30 p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-caption font-bold uppercase text-on-primary">
                    {result.waiterInquiry.language}
                  </span>
                  <h3 className="text-h3 text-text">
                    {isEn ? "Show or Play to Waiter" : "Tunjukkan / Putar Suara ke Pelayan"}
                  </h3>
                </div>

                <div className="mt-4 rounded-2xl border border-primary/30 bg-background p-4 sm:p-5">
                  <p className="text-h2 font-medium text-text select-all leading-relaxed">
                    {result.waiterInquiry.nativePhrase}
                  </p>
                  <p className="mt-2 text-body-sm font-semibold italic text-primary">
                    "{result.waiterInquiry.romanized}"
                  </p>
                  <p className="mt-2 text-caption text-text-muted">
                    {isEn ? "Meaning:" : "Artinya:"} {result.waiterInquiry.translation}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {/* Tombol Utama: Putar suara dalam bahasa negara tujuan liburan */}
                  <button
                    type="button"
                    onClick={() =>
                      playTTS(result.waiterInquiry.nativePhrase, result.waiterInquiry.language, "native")
                    }
                    className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-label font-bold text-on-primary shadow transition hover:bg-primary-hover active:scale-95"
                  >
                    <Volume2 className={`size-4 ${speakingKey === "native" ? "animate-pulse" : ""}`} />
                    {speakingKey === "native"
                      ? isEn
                        ? "Speaking..."
                        : "Sedang berbicara..."
                      : isEn
                        ? `Speak in ${result.waiterInquiry.language}`
                        : `Putar Suara (${result.waiterInquiry.language})`}
                  </button>

                  {/* Tombol Opsi: Putar terjemahan dalam Bahasa Indonesia (jika tujuan di luar negeri) */}
                  {!result.waiterInquiry.language.toLowerCase().includes("indonesia") && (
                    <button
                      type="button"
                      onClick={() =>
                        playTTS(result.waiterInquiry.translation, "Indonesian", "translation")
                      }
                      className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-border-strong bg-surface px-5 text-label font-bold text-text shadow-sm transition hover:bg-surface-muted active:scale-95"
                    >
                      <Volume2 className={`size-4 ${speakingKey === "translation" ? "animate-pulse" : ""}`} />
                      {speakingKey === "translation"
                        ? isEn
                          ? "Speaking ID..."
                          : "Sedang berbicara..."
                        : isEn
                          ? "Play Indonesian"
                          : "Putar Bahasa Indonesia"}
                    </button>
                  )}

                  <span className="inline-flex items-center text-caption text-text-muted">
                    {isEn
                      ? "💡 You can also show this screen directly to the restaurant staff."
                      : "💡 Kamu juga bisa langsung menghadapkan layar HP ini ke pelayan restoran."}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <FieldPassModal
        isOpen={showFieldPass}
        onClose={() => setShowFieldPass(false)}
        tripId={tripId}
        tripName={tripName}
        destination={destination}
        memberCount={members.length}
        needs={members.flatMap((m) => m.needs)}
        customNeeds={members.map((m) => m.allergies).filter(Boolean)}
      />
    </main>
  );
}
