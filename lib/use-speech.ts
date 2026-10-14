import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

// Reading text aloud with the browser's own voices, which works without a connection once the device has the
// voice. The language is matched as a whole word or tag: matching pieces of a name sent Vietnamese ("vietnamESe")
// and Portuguese ("portuguESe") to a Spanish voice.

const LANGUAGE_TAG = /^([a-z]{2,3})(?:[-_]([a-z0-9]{2,8}))*$/i;

// Language names as people and the model write them, in English, Indonesian, and the language itself.
const TAG_BY_NAME: Record<string, string> = {
  english: "en-US",
  inggris: "en-US",
  indonesian: "id-ID",
  indonesia: "id-ID",
  japanese: "ja-JP",
  jepang: "ja-JP",
  日本語: "ja-JP",
  korean: "ko-KR",
  korea: "ko-KR",
  한국어: "ko-KR",
  thai: "th-TH",
  thailand: "th-TH",
  chinese: "zh-CN",
  mandarin: "zh-CN",
  tionghoa: "zh-CN",
  中文: "zh-CN",
  cantonese: "zh-HK",
  kanton: "zh-HK",
  french: "fr-FR",
  prancis: "fr-FR",
  français: "fr-FR",
  german: "de-DE",
  jerman: "de-DE",
  deutsch: "de-DE",
  italian: "it-IT",
  italia: "it-IT",
  italiano: "it-IT",
  spanish: "es-ES",
  spanyol: "es-ES",
  español: "es-ES",
  portuguese: "pt-PT",
  portugis: "pt-PT",
  vietnamese: "vi-VN",
  vietnam: "vi-VN",
  arabic: "ar-SA",
  arab: "ar-SA",
  malay: "ms-MY",
  melayu: "ms-MY",
  dutch: "nl-NL",
  belanda: "nl-NL",
  turkish: "tr-TR",
  turki: "tr-TR",
  russian: "ru-RU",
  rusia: "ru-RU",
  hindi: "hi-IN",
  tagalog: "fil-PH",
  filipino: "fil-PH",
  greek: "el-GR",
  yunani: "el-GR",
  swedish: "sv-SE",
  swedia: "sv-SE",
};

/**
 * The BCP-47 tag to speak a language in, from a tag ("vi-VN", "ja") or a name ("Vietnamese", "Bahasa Jepang",
 * "Japanese (日本語)"). Null when it is neither.
 */
export function speechLanguageTag(language: string): string | null {
  const trimmed = language.trim();
  const tagged = LANGUAGE_TAG.exec(trimmed);
  if (tagged && !(trimmed.toLowerCase() in TAG_BY_NAME)) {
    const [primary, ...rest] = trimmed.split(/[-_]/);
    return [primary.toLowerCase(), ...rest.map((part) => (part.length === 2 ? part.toUpperCase() : part))].join("-");
  }
  const words = trimmed.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  const found = words.find((word) => word in TAG_BY_NAME);
  return found ? TAG_BY_NAME[found] : null;
}

/** A voice for the tag: the same language and region first, then the same language anywhere. */
function pickVoice(voices: SpeechSynthesisVoice[], tag: string): SpeechSynthesisVoice | null {
  const wanted = tag.toLowerCase();
  const primary = wanted.split("-")[0];
  const normalized = voices.map((voice) => ({ voice, lang: voice.lang.replace("_", "-").toLowerCase() }));
  const exact = normalized.find((entry) => entry.lang === wanted);
  const sameLanguage = normalized.find((entry) => entry.lang.split("-")[0] === primary);
  return (exact ?? sameLanguage)?.voice ?? null;
}

/** What became of a request to read aloud: it is being read, the browser cannot read, or it has no voice for the language. */
export type SpeakResult = "speaking" | "unsupported" | "noVoice";

const noSubscription = () => () => undefined;
const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

/** Reads text aloud, one piece at a time, and says which piece (by the id it was given) is being read. */
export function useSpeech() {
  const supported = useSyncExternalStore(noSubscription, canSpeak, () => false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (canSpeak()) window.speechSynthesis.cancel();
    },
    [],
  );

  const speak = useCallback((text: string, language: string, id: string): SpeakResult => {
    if (!canSpeak()) return "unsupported";
    const tag = speechLanguageTag(language);
    if (!tag) return "noVoice";
    // Voices load late in Chrome: with none listed yet, the language alone lets the browser choose. With voices
    // listed and none in the language, the text is not read, since another language's voice garbles it.
    const voices = window.speechSynthesis.getVoices();
    const voice = pickVoice(voices, tag);
    if (voices.length > 0 && !voice) return "noVoice";

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = tag;
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.onstart = () => setSpeakingId(id);
    utterance.onend = () => setSpeakingId((current) => (current === id ? null : current));
    utterance.onerror = () => setSpeakingId((current) => (current === id ? null : current));
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
    return "speaking";
  }, []);

  return { supported, speakingId, speak };
}
