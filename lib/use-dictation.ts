import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type RecognitionAlternative = { transcript: string };
type RecognitionResultEvent = { results: ArrayLike<ArrayLike<RecognitionAlternative>> };
type RecognitionErrorEvent = { error: string };

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecognitionConstructor = new () => Recognition;

type SpeechWindow = {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

export type DictationError = "denied" | "network" | "unavailable";

const HEARING_MS = 1200;
const IGNORED_ERRORS = ["no-speech", "aborted"];
const ERROR_KINDS: Record<string, DictationError> = {
  "not-allowed": "denied",
  "service-not-allowed": "denied",
  network: "network",
};

function getRecognitionConstructor(): RecognitionConstructor | null {
  const speechWindow = window as unknown as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function joinSpeech(first: string, second: string): string {
  return [first, second].filter(Boolean).join(" ").trim();
}

const subscribeToNothing = () => () => {};

type DictationOptions = {
  language: string;
  onTranscript: (transcript: string) => void;
};

export function useDictation({ language, onTranscript }: DictationOptions) {
  const supported = useSyncExternalStore(
    subscribeToNothing,
    () => getRecognitionConstructor() !== null,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [hearing, setHearing] = useState(false);
  const [activity, setActivity] = useState(0);
  const [error, setError] = useState<DictationError | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const wantedRef = useRef(false);
  const committedRef = useRef("");
  const sessionRef = useRef("");
  const hearingTimerRef = useRef<number | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const openSessionRef = useRef<() => void>(() => {});

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const finish = useCallback(() => {
    wantedRef.current = false;
    if (hearingTimerRef.current !== null) window.clearTimeout(hearingTimerRef.current);
    setHearing(false);
    setListening(false);
  }, []);

  const openSession = useCallback(() => {
    const RecognitionClass = getRecognitionConstructor();
    if (!RecognitionClass) return;
    const recognition = new RecognitionClass();
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      sessionRef.current = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");
      onTranscriptRef.current(joinSpeech(committedRef.current, sessionRef.current));
      setActivity((count) => count + 1);
      setHearing(true);
      if (hearingTimerRef.current !== null) window.clearTimeout(hearingTimerRef.current);
      hearingTimerRef.current = window.setTimeout(() => setHearing(false), HEARING_MS);
    };
    recognition.onerror = (event) => {
      if (IGNORED_ERRORS.includes(event.error)) return;
      wantedRef.current = false;
      setError(ERROR_KINDS[event.error] ?? "unavailable");
    };
    recognition.onend = () => {
      committedRef.current = joinSpeech(committedRef.current, sessionRef.current);
      sessionRef.current = "";
      if (wantedRef.current) {
        openSessionRef.current();
        return;
      }
      finish();
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      finish();
      setError("unavailable");
    }
  }, [language, finish]);

  useEffect(() => {
    openSessionRef.current = openSession;
  }, [openSession]);

  useEffect(
    () => () => {
      wantedRef.current = false;
      recognitionRef.current?.abort();
      if (hearingTimerRef.current !== null) window.clearTimeout(hearingTimerRef.current);
    },
    [],
  );

  const start = useCallback(() => {
    committedRef.current = "";
    sessionRef.current = "";
    wantedRef.current = true;
    setError(null);
    setListening(true);
    openSession();
  }, [openSession]);

  const stop = useCallback(() => {
    wantedRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  return { supported, listening, hearing, activity, error, start, stop };
}
