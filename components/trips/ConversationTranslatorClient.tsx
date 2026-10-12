"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  Check,
  Compass,
  CornerDownLeft,
  History,
  Languages,
  Loader2,
  Mic,
  MicOff,
  Radio,
  RotateCcw,
  Sparkles,
  StopCircle,
  Utensils,
  Volume2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import PageBackdrop from "@/components/layout/PageBackdrop";
import type { TranslationResult } from "@/lib/agents/translatorAgent";
import { useLocale } from "@/lib/use-locale";

type ConversationTranslatorClientProps = {
  tripId: string;
  tripName: string;
  destination: string;
};

type MessageItem = {
  id: string;
  sender: "traveler" | "local";
  originalText: string;
  translatedText: string;
  romanized: string;
  sourceLang: string;
  targetLang: string;
  politenessLevel?: string;
  culturalTip?: string;
  timestamp: string;
};

const SUPPORTED_LANGUAGES = [
  { code: "Japanese", langTag: "ja-JP", nameId: "Jepang (日本語)", nameEn: "Japanese (日本語)", flag: "🇯🇵" },
  { code: "Korean", langTag: "ko-KR", nameId: "Korea (한국어)", nameEn: "Korean (한국어)", flag: "🇰🇷" },
  { code: "Thai", langTag: "th-TH", nameId: "Thailand (ภาษาไทย)", nameEn: "Thai (ภาษาไทย)", flag: "🇹🇭" },
  { code: "Chinese", langTag: "zh-CN", nameId: "Mandarin (中文)", nameEn: "Chinese (中文)", flag: "🇨🇳" },
  { code: "French", langTag: "fr-FR", nameId: "Prancis (Français)", nameEn: "French (Français)", flag: "🇫🇷" },
  { code: "German", langTag: "de-DE", nameId: "Jerman (Deutsch)", nameEn: "German (Deutsch)", flag: "🇩🇪" },
  { code: "Italian", langTag: "it-IT", nameId: "Italia (Italiano)", nameEn: "Italian (Italiano)", flag: "🇮🇹" },
  { code: "Spanish", langTag: "es-ES", nameId: "Spanyol (Español)", nameEn: "Spanish (Español)", flag: "🇪🇸" },
  { code: "Vietnamese", langTag: "vi-VN", nameId: "Vietnam (Tiếng Việt)", nameEn: "Vietnamese (Tiếng Việt)", flag: "🇻🇳" },
  { code: "Arabic", langTag: "ar-SA", nameId: "Arab (العربية)", nameEn: "Arabic (العربية)", flag: "🇸🇦" },
  { code: "Malay", langTag: "ms-MY", nameId: "Melayu (Bahasa Melayu)", nameEn: "Malay (Bahasa Melayu)", flag: "🇲🇾" },
  { code: "English", langTag: "en-US", nameId: "Inggris (English)", nameEn: "English", flag: "🇬🇧" },
  { code: "Indonesian", langTag: "id-ID", nameId: "Indonesia (Bahasa Indonesia)", nameEn: "Indonesian", flag: "🇮🇩" },
];

function detectDefaultLanguage(destination: string, userLocale: string): typeof SUPPORTED_LANGUAGES[0] {
  const destLower = (destination || "").toLowerCase().trim();
  if (!destLower) return SUPPORTED_LANGUAGES[0]; // Default Japanese if empty

  // Japan
  if (
    destLower.includes("japan") ||
    destLower.includes("jepang") ||
    destLower.includes("tokyo") ||
    destLower.includes("osaka") ||
    destLower.includes("kyoto") ||
    destLower.includes("sapporo") ||
    destLower.includes("fukuoka") ||
    destLower.includes("hokkaido") ||
    destLower.includes("okinawa") ||
    destLower.includes("nagoya") ||
    destLower.includes("hiroshima")
  ) {
    return SUPPORTED_LANGUAGES[0]; // Japanese
  }

  // South Korea
  if (
    destLower.includes("korea") ||
    destLower.includes("seoul") ||
    destLower.includes("busan") ||
    destLower.includes("jeju") ||
    destLower.includes("incheon") ||
    destLower.includes("daegu")
  ) {
    return SUPPORTED_LANGUAGES[1]; // Korean
  }

  // Thailand
  if (
    destLower.includes("thai") ||
    destLower.includes("bangkok") ||
    destLower.includes("phuket") ||
    destLower.includes("chiang mai") ||
    destLower.includes("pattaya") ||
    destLower.includes("krabi")
  ) {
    return SUPPORTED_LANGUAGES[2]; // Thai
  }

  // Greater China & Taiwan
  if (
    destLower.includes("chin") ||
    destLower.includes("tiongkok") ||
    destLower.includes("beijing") ||
    destLower.includes("shanghai") ||
    destLower.includes("taiwan") ||
    destLower.includes("taipei") ||
    destLower.includes("hong kong") ||
    destLower.includes("guangzhou") ||
    destLower.includes("shenzhen")
  ) {
    return SUPPORTED_LANGUAGES[3]; // Chinese
  }

  // France
  if (
    destLower.includes("franc") ||
    destLower.includes("prancis") ||
    destLower.includes("paris") ||
    destLower.includes("nice") ||
    destLower.includes("lyon")
  ) {
    return SUPPORTED_LANGUAGES[4]; // French
  }

  // Germany
  if (
    destLower.includes("german") ||
    destLower.includes("jerman") ||
    destLower.includes("berlin") ||
    destLower.includes("munich") ||
    destLower.includes("frankfurt")
  ) {
    return SUPPORTED_LANGUAGES[5]; // German
  }

  // Italy
  if (
    destLower.includes("ital") ||
    destLower.includes("rome") ||
    destLower.includes("roma") ||
    destLower.includes("milan") ||
    destLower.includes("florence") ||
    destLower.includes("venice")
  ) {
    return SUPPORTED_LANGUAGES[6]; // Italian
  }

  // Spain
  if (
    destLower.includes("spain") ||
    destLower.includes("spanyol") ||
    destLower.includes("madrid") ||
    destLower.includes("barcelona") ||
    destLower.includes("seville")
  ) {
    return SUPPORTED_LANGUAGES[7]; // Spanish
  }

  // Vietnam
  if (
    destLower.includes("vietnam") ||
    destLower.includes("hanoi") ||
    destLower.includes("da nang") ||
    destLower.includes("saigon") ||
    destLower.includes("ho chi minh")
  ) {
    return SUPPORTED_LANGUAGES[8]; // Vietnamese
  }

  // Middle East
  if (
    destLower.includes("arab") ||
    destLower.includes("dubai") ||
    destLower.includes("uae") ||
    destLower.includes("makkah") ||
    destLower.includes("madinah") ||
    destLower.includes("qatar") ||
    destLower.includes("doha") ||
    destLower.includes("riyadh")
  ) {
    return SUPPORTED_LANGUAGES[9]; // Arabic
  }

  // Malaysia
  if (
    destLower.includes("malay") ||
    destLower.includes("kuala lumpur") ||
    destLower.includes("penang")
  ) {
    return SUPPORTED_LANGUAGES[10]; // Malay
  }

  // English destinations (Singapore, UK, USA, Australia, dll.)
  if (
    destLower.includes("singapore") ||
    destLower.includes("singapura") ||
    destLower.includes("uk") ||
    destLower.includes("london") ||
    destLower.includes("england") ||
    destLower.includes("usa") ||
    destLower.includes("america") ||
    destLower.includes("amerika") ||
    destLower.includes("australia") ||
    destLower.includes("sydney") ||
    destLower.includes("melbourne")
  ) {
    return SUPPORTED_LANGUAGES[11]; // English
  }

  // Indonesia Domestic Trip
  if (
    destLower.includes("indonesia") ||
    destLower.includes("bali") ||
    destLower.includes("jogja") ||
    destLower.includes("yogyakarta") ||
    destLower.includes("jakarta") ||
    destLower.includes("bandung") ||
    destLower.includes("lombok") ||
    destLower.includes("labuan bajo") ||
    destLower.includes("medan") ||
    destLower.includes("surabaya")
  ) {
    // Jika traveler berbahasa Indonesia pada liburan domestik, default partner bahasa Inggris (berguna untuk komunikasi dengan wisatawan asing / staf internasional)
    if (userLocale === "id") {
      return SUPPORTED_LANGUAGES[11]; // English
    }
    return SUPPORTED_LANGUAGES[12]; // Indonesian
  }

  return SUPPORTED_LANGUAGES[0]; // Default to Japanese
}

const QUICK_PHRASES_ID = [
  { label: "Minta Tagihan", text: "Bisa minta tagihan / bill-nya?", context: "restaurant" },
  { label: "Berapa Harganya?", text: "Berapa harga barang ini?", context: "shopping" },
  { label: "Di Mana Toilet?", text: "Permisi, di mana letak toilet terdekat?", context: "general" },
  { label: "Rekomendasi Menu", text: "Apa menu yang paling direkomendasikan di sini?", context: "restaurant" },
  { label: "Panggilkan Taksi", text: "Bisa tolong panggilkan taksi untuk saya?", context: "transit" },
  { label: "Tolong Bantu Saya", text: "Permisi, saya tersesat. Bisakah Anda membantu saya?", context: "emergency" },
];

const QUICK_PHRASES_EN = [
  { label: "Ask for the Bill", text: "Could I please get the bill / check?", context: "restaurant" },
  { label: "How Much is This?", text: "How much does this cost?", context: "shopping" },
  { label: "Where is the Restroom?", text: "Excuse me, where is the nearest restroom?", context: "general" },
  { label: "Chef's Recommendation", text: "What do you recommend here?", context: "restaurant" },
  { label: "Call a Taxi", text: "Could you please help call a taxi for me?", context: "transit" },
  { label: "Help, I'm Lost", text: "Excuse me, I'm a bit lost. Could you help me?", context: "emergency" },
];

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function ConversationTranslatorClient({
  tripId,
  tripName,
  destination,
}: ConversationTranslatorClientProps) {
  const locale = useLocale();
  const isEn = locale === "en";

  const [travelerLang, setTravelerLang] = useState<string>(isEn ? "English" : "Indonesian");
  const [localLang, setLocalLang] = useState<typeof SUPPORTED_LANGUAGES[0]>(() =>
    detectDefaultLanguage(destination, locale)
  );

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [travelerInput, setTravelerInput] = useState("");
  const [localInput, setLocalInput] = useState("");
  const [translating, setTranslating] = useState(false);
  const [activeRecording, setActiveRecording] = useState<"traveler" | "local" | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isFaceToFace, setIsFaceToFace] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Timer saat merekam
  useEffect(() => {
    if (!activeRecording) {
      setRecordingSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeRecording]);

  // Cleanup saat unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const playTTS = (text: string, languageTag: string, id: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    const langLower = languageTag.toLowerCase();
    if (langLower.includes("japan") || langLower.includes("ja")) utterance.lang = "ja-JP";
    else if (langLower.includes("korea") || langLower.includes("ko")) utterance.lang = "ko-KR";
    else if (langLower.includes("thai") || langLower.includes("th")) utterance.lang = "th-TH";
    else if (langLower.includes("chine") || langLower.includes("mandarin") || langLower.includes("zh")) utterance.lang = "zh-CN";
    else if (langLower.includes("french") || langLower.includes("fr")) utterance.lang = "fr-FR";
    else if (langLower.includes("german") || langLower.includes("de")) utterance.lang = "de-DE";
    else if (langLower.includes("ital") || langLower.includes("it")) utterance.lang = "it-IT";
    else if (langLower.includes("span") || langLower.includes("es")) utterance.lang = "es-ES";
    else if (langLower.includes("viet") || langLower.includes("vi")) utterance.lang = "vi-VN";
    else if (langLower.includes("arab") || langLower.includes("ar")) utterance.lang = "ar-SA";
    else if (langLower.includes("malay") || langLower.includes("ms")) utterance.lang = "ms-MY";
    else if (langLower.includes("indonesia") || langLower.includes("id")) utterance.lang = "id-ID";
    else utterance.lang = "en-US";

    try {
      const voices = window.speechSynthesis.getVoices();
      const prefix = utterance.lang.slice(0, 2).toLowerCase();
      const match = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
      if (match) utterance.voice = match;
    } catch {}

    utterance.rate = 0.92;
    utterance.onstart = () => setSpeakingId(id);
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    window.speechSynthesis.speak(utterance);
  };

  const handleTranslate = async ({
    textToSend,
    audioBlob,
    audioMimeType,
    sender,
    context = "general",
  }: {
    textToSend?: string;
    audioBlob?: Blob;
    audioMimeType?: string;
    sender: "traveler" | "local";
    context?: string;
  }) => {
    if ((!textToSend || !textToSend.trim()) && !audioBlob) return;
    if (translating) return;

    setTranslating(true);
    setMicError(null);
    const sourceLang = sender === "traveler" ? travelerLang : localLang.code;
    const targetLang = sender === "traveler" ? localLang.code : travelerLang;

    try {
      let audioBase64: string | undefined;
      if (audioBlob) {
        audioBase64 = await blobToBase64(audioBlob);
      }

      const res = await fetch("/api/conversation-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSend?.trim(),
          audioBase64,
          audioMimeType: audioMimeType || audioBlob?.type || "audio/webm",
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          tripId,
          context,
          locale,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || (isEn ? "Translation failed" : "Gagal menerjemahkan"));
      }

      const data: TranslationResult = await res.json();
      const msgId = `msg-${Date.now()}`;

      const newMessage: MessageItem = {
        id: msgId,
        sender,
        originalText: data.originalText || textToSend || (isEn ? "Spoken voice" : "Rekaman suara"),
        translatedText: data.translatedText,
        romanized: data.romanized,
        sourceLang,
        targetLang,
        politenessLevel: data.politenessLevel,
        culturalTip: data.culturalTip,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, newMessage]);

      if (sender === "traveler") {
        setTravelerInput("");
      } else {
        setLocalInput("");
      }

      // Otomatis putar audio jika autoSpeak aktif
      if (autoSpeak) {
        const speakLangTag =
          sender === "traveler"
            ? localLang.langTag
            : travelerLang.toLowerCase().includes("indonesia")
            ? "id-ID"
            : "en-US";
        playTTS(data.translatedText, speakLangTag, msgId);
      }
    } catch (err: any) {
      console.error("Translation error:", err);
      setMicError(err.message || (isEn ? "Failed to translate" : "Terjadi kesalahan penerjemahan"));
    } finally {
      setTranslating(false);
    }
  };

  // Perekaman Audio Universal (Mendukung Web Speech API + Fallback MediaRecorder Gemini)
  const toggleVoiceInput = async (speaker: "traveler" | "local") => {
    setMicError(null);

    // Jika sedang merekam tombol yang sama, hentikan rekaman dan proses
    if (activeRecording === speaker) {
      stopVoiceRecording(speaker);
      return;
    }

    // Jika sedang merekam pihak lain, hentikan dulu
    if (activeRecording && activeRecording !== speaker) {
      stopVoiceRecording(activeRecording);
    }

    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    // Coba gunakan Web Speech API terlebih dahulu jika didukung peramban
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = true;

        if (speaker === "traveler") {
          recognition.lang = travelerLang === "Indonesian" ? "id-ID" : "en-US";
        } else {
          recognition.lang = localLang.langTag;
        }

        setActiveRecording(speaker);

        let finalTranscript = "";

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const currentText = finalTranscript || interimTranscript;
          if (speaker === "traveler") {
            setTravelerInput(currentText);
          } else {
            setLocalInput(currentText);
          }

          if (finalTranscript) {
            setActiveRecording(null);
            handleTranslate({ textToSend: finalTranscript, sender: speaker });
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("SpeechRecognition error, falling back to MediaRecorder:", event.error);
          setActiveRecording(null);
          // Jika error not-allowed, beri tahu izin mikrofon
          if (event.error === "not-allowed") {
            setMicError(
              isEn
                ? "Microphone access blocked. Please allow mic permissions in your browser."
                : "Akses mikrofon diblokir. Mohon izinkan mikrofon di pengaturan browser Anda."
            );
            return;
          }
          // Fallback otomatis ke MediaRecorder jika network/speech-service gagal
          startMediaRecorderFallback(speaker);
        };

        recognition.onend = () => {
          setActiveRecording(null);
        };

        recognition.start();
        return;
      } catch (e) {
        console.warn("SpeechRecognition start failed, trying MediaRecorder fallback:", e);
      }
    }

    // Fallback: MediaRecorder langsung (Didukung 100% oleh semua browser termasuk Firefox di Linux)
    startMediaRecorderFallback(speaker);
  };

  const startMediaRecorderFallback = async (speaker: "traveler" | "local") => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          isEn
            ? "Microphone is not supported in this browser."
            : "Mikrofon tidak didukung di browser ini."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
        else if (MediaRecorder.isTypeSupported("audio/ogg")) mimeType = "audio/ogg";
        else mimeType = "";
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        if (audioBlob.size > 0) {
          handleTranslate({
            audioBlob,
            audioMimeType: audioBlob.type,
            sender: speaker,
          });
        }
      };

      mediaRecorder.start();
      setActiveRecording(speaker);
    } catch (err: any) {
      console.error("MediaRecorder start error:", err);
      setActiveRecording(null);
      setMicError(
        isEn
          ? "Microphone permission denied. Please allow microphone access or type your text."
          : "Izin mikrofon belum aktif. Mohon izinkan mikrofon di browser atau ketik teks di bawah."
      );
    }
  };

  const stopVoiceRecording = (speaker: "traveler" | "local") => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setActiveRecording(null);
  };

  const quickPhrases = isEn ? QUICK_PHRASES_EN : QUICK_PHRASES_ID;

  return (
    <main className="relative isolate mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-4xl flex-col px-4 pt-24 pb-12 sm:px-6 sm:pt-28">
      <PageBackdrop />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/trips/${encodeURIComponent(tripId)}`}
          className="group inline-flex min-h-11 items-center gap-2 rounded-sm text-label text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4 transition-[translate] duration-200 ease-out group-hover:-translate-x-1" />
          {isEn ? "Back to Trip" : "Kembali ke Perjalanan"}
        </Link>

        {/* Setting Bar: Target Language, Audio Toggle, Flip Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Target Country/Language Selector */}
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 shadow-sm">
            <span className="text-caption font-bold text-text-muted">
              {isEn ? "Destination:" : "Bahasa Staf:"}
            </span>
            <span className="text-base">{localLang.flag}</span>
            <select
              value={localLang.code}
              onChange={(e) => {
                const found = SUPPORTED_LANGUAGES.find((l) => l.code === e.target.value);
                if (found) setLocalLang(found);
              }}
              className="bg-transparent text-caption font-bold text-text outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-surface text-text">
                  {lang.flag} {isEn ? lang.nameEn : lang.nameId}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-TTS Toggle */}
          <button
            type="button"
            onClick={() => setAutoSpeak(!autoSpeak)}
            title={autoSpeak ? (isEn ? "Auto-TTS is ON" : "Auto-TTS Aktif") : (isEn ? "Auto-TTS is OFF" : "Auto-TTS Nonaktif")}
            className={`flex size-9 cursor-pointer items-center justify-center rounded-full border transition ${
              autoSpeak
                ? "border-primary bg-primary-subtle text-primary"
                : "border-border bg-surface text-text-muted hover:text-text"
            }`}
          >
            <Volume2 className="size-4" />
          </button>

          {/* 180° Flip Screen for Partner */}
          <button
            type="button"
            onClick={() => setIsFaceToFace(!isFaceToFace)}
            title={isEn ? "Face-to-Face Screen (180° Flip)" : "Mode Hadap-Hadapan (Putar Layar 180°)"}
            className={`flex size-9 cursor-pointer items-center justify-center rounded-full border transition ${
              isFaceToFace
                ? "border-primary bg-primary text-on-primary"
                : "border-border bg-surface text-text-muted hover:text-text"
            }`}
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-h2 text-text sm:text-h1">
            {isEn ? "Two-Way Spoken Translator" : "Penerjemah Percakapan Langsung"}
          </h1>
          <p className="mt-1 text-body-sm text-text-muted">
            {isEn
              ? `Real-time dialogue interpreter for ${destination || tripName}. Tap mic or type to converse naturally with staff and locals.`
              : `Penerjemah lisan dua arah untuk ${destination || tripName}. Tekan tombol mic atau ketik teks untuk mengobrol langsung.`}
          </p>
        </div>

        {destination && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-caption font-bold text-text">
            📍 {destination}
          </span>
        )}
      </div>

      {/* Error Banner If Mic Permission Denied */}
      {micError && (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-error/30 bg-error-subtle p-3 text-caption font-medium text-on-error-subtle animate-shake">
          <span>⚠️ {micError}</span>
          <button
            type="button"
            onClick={() => setMicError(null)}
            className="text-on-error-subtle/80 hover:text-on-error-subtle"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Face-to-Face Partner Viewport (If Activated) */}
      {isFaceToFace && (
        <div className="mt-6 rotate-180 rounded-3xl border-2 border-primary/40 bg-surface-muted/90 p-5 shadow-xl transition-transform duration-300">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-caption font-bold text-on-primary">
              {localLang.flag} {localLang.code} (Staff / Local)
            </span>
            <span className="text-caption font-medium text-text-muted">
              {isEn ? "Flip view for staff" : "Layar menghadap lawan bicara"}
            </span>
          </div>

          <div className="mt-3 min-h-20 text-center">
            {messages.length > 0 && messages[messages.length - 1].sender === "traveler" ? (
              <div className="space-y-1">
                <p className="text-h2 font-bold text-text">
                  {messages[messages.length - 1].translatedText}
                </p>
                <p className="text-caption italic text-text-muted">
                  "{messages[messages.length - 1].romanized}"
                </p>
              </div>
            ) : (
              <p className="py-4 text-label text-text-muted">
                {isEn
                  ? "Speak below to display your translation here."
                  : "Bicaralah di bawah, terjemahan akan tampil menghadap lawan bicara di sini."}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Conversation Stream */}
      <div className="mt-6 flex flex-1 flex-col rounded-3xl border border-border bg-surface p-4 sm:p-6 shadow-sm min-h-[380px]">
        {messages.length === 0 ? (
          <div className="my-auto flex flex-col items-center justify-center py-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary-subtle text-primary">
              <Languages className="size-8" />
            </div>
            <h3 className="mt-4 text-h3 text-text">
              {isEn ? "Start Two-Way Conversation" : "Mulai Percakapan Dua Arah"}
            </h3>
            <p className="mt-1 max-w-md text-body-sm text-text-muted">
              {isEn
                ? `Tap the blue mic button to speak in ${travelerLang}, or the green button for the restaurant staff / local in ${localLang.nameEn}.`
                : `Tekan mic biru untuk Anda berbicara (${travelerLang}), atau mic hijau untuk pelayan / staf lokal berbicara (${localLang.nameId}).`}
            </p>

            {/* Quick Phrases Pills */}
            <div className="mt-6 w-full max-w-lg">
              <p className="text-caption font-bold uppercase tracking-wider text-text-muted">
                {isEn ? "Quick Conversation Phrases" : "Frasa Cepat Siap Pakai"}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {quickPhrases.map((phrase, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={translating}
                    onClick={() =>
                      handleTranslate({
                        textToSend: phrase.text,
                        sender: "traveler",
                        context: phrase.context,
                      })
                    }
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border-strong bg-surface-muted px-3.5 py-1.5 text-caption font-medium text-text transition hover:border-primary hover:bg-primary-subtle hover:text-primary active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles className="size-3 text-primary" />
                    {phrase.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto pr-1">
            {messages.map((m) => {
              const isTraveler = m.sender === "traveler";
              const isPlaying = speakingId === m.id;

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isTraveler ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 shadow-sm transition-all ${
                      isTraveler
                        ? "bg-primary text-on-primary rounded-br-sm"
                        : "bg-surface-muted border border-border text-text rounded-bl-sm"
                    }`}
                  >
                    {/* Header Label */}
                    <div className="flex items-center justify-between gap-3 text-caption opacity-80 pb-1 border-b border-white/20">
                      <span className="font-bold">
                        {isTraveler
                          ? isEn
                            ? "You (Traveler)"
                            : "Anda (Wisatawan)"
                          : `${localLang.flag} ${localLang.nameId}`}
                      </span>
                      <span>{m.timestamp}</span>
                    </div>

                    {/* Original Text */}
                    <p className="mt-2 text-body-sm opacity-90 italic">
                      "{m.originalText}"
                    </p>

                    {/* Translated Text (Large & Clear) */}
                    <p className={`mt-2 text-h3 font-bold select-all leading-relaxed ${isTraveler ? "text-white" : "text-text"}`}>
                      {m.translatedText}
                    </p>

                    {/* Romanization if foreign characters */}
                    {m.romanized && m.romanized !== m.translatedText && (
                      <p className={`mt-1 text-caption italic font-medium ${isTraveler ? "text-white/80" : "text-primary"}`}>
                        Pronunciation: "{m.romanized}"
                      </p>
                    )}

                    {/* Cultural / Politeness Tip */}
                    {m.culturalTip && (
                      <div className={`mt-2 rounded-xl p-2 text-caption ${isTraveler ? "bg-black/20 text-white/90" : "bg-primary-subtle text-on-primary-subtle"}`}>
                        💡 {m.culturalTip}
                      </div>
                    )}

                    {/* Play Audio Button */}
                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          playTTS(
                            m.translatedText,
                            isTraveler
                              ? localLang.langTag
                              : travelerLang.toLowerCase().includes("indonesia")
                              ? "id-ID"
                              : "en-US",
                            m.id
                          )
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-bold transition active:scale-95 ${
                          isTraveler
                            ? "bg-white/20 text-white hover:bg-white/30"
                            : "bg-surface border border-border text-text hover:bg-surface-muted"
                        }`}
                      >
                        <Volume2 className={`size-3.5 ${isPlaying ? "animate-pulse" : ""}`} />
                        {isPlaying ? (isEn ? "Playing..." : "Memutar...") : (isEn ? "Play Audio" : "Putar Audio")}
                      </button>

                      {m.politenessLevel && (
                        <span className="text-[11px] opacity-75">
                          {m.politenessLevel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>
        )}

        {translating && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-muted p-2.5 text-caption text-text-muted animate-pulse">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>{isEn ? "Gemini is translating audio..." : "AI sedang mendengarkan & menerjemahkan..."}</span>
          </div>
        )}
      </div>

      {/* Dual Input Console (Walkie-Talkie Style) */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Left / Traveler Console (Blue / Primary) */}
        <div className={`flex flex-col justify-between rounded-2xl border-2 p-3 sm:p-4 shadow-sm transition ${
          activeRecording === "traveler"
            ? "border-error bg-error-subtle/30"
            : "border-primary/40 bg-primary-subtle/20"
        }`}>
          <div className="flex items-center justify-between pb-2">
            <span className="text-caption font-bold text-primary">
              🗣️ {isEn ? "Traveler (You)" : "Anda (Wisatawan)"} ({travelerLang})
            </span>
            {activeRecording === "traveler" && (
              <span className="flex items-center gap-1.5 text-caption font-bold text-error animate-pulse">
                <span className="size-2.5 rounded-full bg-error animate-ping" />
                {isEn ? `Recording ${recordingSeconds}s (Tap mic to send)` : `Merekam ${recordingSeconds}d (Klik mic untuk kirim)`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={travelerInput}
              disabled={translating || activeRecording !== null}
              onChange={(e) => setTravelerInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleTranslate({ textToSend: travelerInput, sender: "traveler" });
                }
              }}
              placeholder={isEn ? "Type or tap mic to speak..." : "Ketik atau tekan mic untuk bicara..."}
              className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-body-sm text-text outline-none focus:border-primary disabled:opacity-70"
            />

            <button
              type="button"
              disabled={translating}
              onClick={() => toggleVoiceInput("traveler")}
              title={activeRecording === "traveler" ? (isEn ? "Stop & Send" : "Berhenti & Kirim") : (isEn ? "Speak in your language" : "Bicara dengan suara")}
              className={`flex size-11 cursor-pointer items-center justify-center rounded-full text-white shadow transition active:scale-90 ${
                activeRecording === "traveler"
                  ? "bg-error animate-pulse shadow-error/50"
                  : "bg-primary hover:bg-primary-hover shadow-primary/20"
              }`}
            >
              {activeRecording === "traveler" ? <StopCircle className="size-5" /> : <Mic className="size-5" />}
            </button>

            {travelerInput.trim() && (
              <button
                type="button"
                disabled={translating}
                onClick={() => handleTranslate({ textToSend: travelerInput, sender: "traveler" })}
                className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-primary text-on-primary transition hover:bg-primary-hover active:scale-95"
              >
                <ArrowRight className="size-5" />
              </button>
            )}
          </div>
        </div>

        {/* Right / Local Staff Console (Emerald / Green) */}
        <div className={`flex flex-col justify-between rounded-2xl border-2 p-3 sm:p-4 shadow-sm transition ${
          activeRecording === "local"
            ? "border-error bg-error-subtle/30"
            : "border-emerald-500/40 bg-emerald-500/5"
        }`}>
          <div className="flex items-center justify-between pb-2">
            <span className="text-caption font-bold text-emerald-600 dark:text-emerald-400">
              {localLang.flag} {localLang.nameId} ({isEn ? "Staff / Local" : "Pelayan / Staf"})
            </span>
            {activeRecording === "local" && (
              <span className="flex items-center gap-1.5 text-caption font-bold text-error animate-pulse">
                <span className="size-2.5 rounded-full bg-error animate-ping" />
                {isEn ? `Recording ${recordingSeconds}s (Tap mic to send)` : `Merekam ${recordingSeconds}d (Klik mic untuk kirim)`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={localInput}
              disabled={translating || activeRecording !== null}
              onChange={(e) => setLocalInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleTranslate({ textToSend: localInput, sender: "local" });
                }
              }}
              placeholder={`${localLang.nameId}...`}
              className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-body-sm text-text outline-none focus:border-emerald-500 disabled:opacity-70"
            />

            <button
              type="button"
              disabled={translating}
              onClick={() => toggleVoiceInput("local")}
              title={activeRecording === "local" ? (isEn ? "Stop & Send" : "Berhenti & Kirim") : (isEn ? "Staff speaks" : "Pelayan / Staf berbicara")}
              className={`flex size-11 cursor-pointer items-center justify-center rounded-full text-white shadow transition active:scale-90 ${
                activeRecording === "local"
                  ? "bg-error animate-pulse shadow-error/50"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
              }`}
            >
              {activeRecording === "local" ? <StopCircle className="size-5" /> : <Mic className="size-5" />}
            </button>

            {localInput.trim() && (
              <button
                type="button"
                disabled={translating}
                onClick={() => handleTranslate({ textToSend: localInput, sender: "local" })}
                className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 active:scale-95"
              >
                <ArrowRight className="size-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
