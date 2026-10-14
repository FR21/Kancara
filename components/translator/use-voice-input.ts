import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Listening to one side of the conversation. Chrome, Edge, and Safari turn speech into text themselves
// (SpeechRecognition); Firefox has no such thing, so there the microphone is recorded and the recording is sent to
// be heard by the model instead. A browser with neither keeps the text fields only.

export type Speaker = "traveler" | "local";
/** How this browser listens: it writes down what it hears, it records, or it cannot listen. */
export type VoiceMode = "recognition" | "recording" | "none";
export type VoiceFailure = "blocked" | "noSpeech" | "failed";

type RecognitionAlternative = { transcript: string };
type RecognitionResult = { isFinal: boolean; length: number; [index: number]: RecognitionAlternative };
type RecognitionEvent = { resultIndex: number; results: { length: number; [index: number]: RecognitionResult } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionConstructor = new () => Recognition;

type VoiceHandlers = {
  /** What is heard so far; `final` once the speaker has finished. */
  onTranscript: (speaker: Speaker, transcript: string, final: boolean) => void;
  onRecording: (speaker: Speaker, recording: Blob) => void;
  onFailure: (failure: VoiceFailure) => void;
};

// A sentence to a waiter is short; a recording left running is stopped before it grows too large to send.
const MAX_RECORDING_MS = 30_000;
const RECORDING_TYPES = ["audio/webm", "audio/mp4", "audio/ogg"];

function recognitionConstructor(): RecognitionConstructor | null {
  const scope: Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor } = window;
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

function canRecord(): boolean {
  return typeof MediaRecorder !== "undefined" && navigator.mediaDevices?.getUserMedia !== undefined;
}

function detectMode(): VoiceMode {
  if (recognitionConstructor()) return "recognition";
  return canRecord() ? "recording" : "none";
}

const noSubscription = () => () => undefined;

export function useVoiceInput(handlers: VoiceHandlers) {
  const mode = useSyncExternalStore(noSubscription, detectMode, (): VoiceMode => "none");
  const [activeSpeaker, setActiveSpeaker] = useState<Speaker | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const handlersRef = useRef(handlers);
  const recognitionRef = useRef<Recognition | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!activeSpeaker) return;
    const timer = setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [activeSpeaker]);

  const stop = () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
    setActiveSpeaker(null);
  };

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    },
    [],
  );

  const record = async (speaker: Speaker) => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (caught) {
      setActiveSpeaker(null);
      handlersRef.current.onFailure(caught instanceof DOMException && caught.name === "NotAllowedError" ? "blocked" : "failed");
      return;
    }
    // Safari records MP4 and Firefox Ogg or WebM; the first type the browser can write is used.
    const mimeType = RECORDING_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const recording = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
      if (recording.size > 0) handlersRef.current.onRecording(speaker, recording);
      else handlersRef.current.onFailure("noSpeech");
    };
    recorderRef.current = recorder;
    recorder.start();
    stopTimerRef.current = setTimeout(stop, MAX_RECORDING_MS);
  };

  const listen = (speaker: Speaker, languageTag: string, Constructor: RecognitionConstructor) => {
    const recognition = new Constructor();
    recognition.lang = languageTag;
    recognition.continuous = false;
    recognition.interimResults = true;
    let heard = "";
    recognition.onresult = (event) => {
      let finished = "";
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finished += result[0].transcript;
        else interim += result[0].transcript;
      }
      heard += finished;
      handlersRef.current.onTranscript(speaker, heard || interim, finished !== "");
    };
    recognition.onerror = (event) => {
      recognitionRef.current = null;
      setActiveSpeaker(null);
      if (event.error === "aborted") return;
      if (event.error === "not-allowed") return handlersRef.current.onFailure("blocked");
      if (event.error === "no-speech") return handlersRef.current.onFailure("noSpeech");
      // The browser's own speech service is out of reach (it runs online) or lacks the language: record instead.
      if (canRecord()) {
        setActiveSpeaker(speaker);
        void record(speaker);
        return;
      }
      handlersRef.current.onFailure("failed");
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setActiveSpeaker((current) => (recorderRef.current ? current : null));
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  /** Starts listening to `speaker` in `languageTag`, or stops when they are already being listened to. */
  const toggle = (speaker: Speaker, languageTag: string) => {
    const wasActive = activeSpeaker === speaker;
    if (activeSpeaker) stop();
    if (wasActive || mode === "none") return;
    setElapsedSeconds(0);
    setActiveSpeaker(speaker);
    const Constructor = recognitionConstructor();
    try {
      if (Constructor) listen(speaker, languageTag, Constructor);
      else void record(speaker);
    } catch {
      setActiveSpeaker(null);
      handlersRef.current.onFailure("failed");
    }
  };

  return { mode, activeSpeaker, elapsedSeconds, toggle, stop };
}
