"use client";

import { Mic, SendHorizontal, Square } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useRef } from "react";
import type { Messages } from "@/lib/messages";
import { useDictation } from "@/lib/use-dictation";
import { useLocale } from "@/lib/use-locale";
import VoiceOrb from "./VoiceOrb";

type ComposerProps = {
  value: string;
  disabled: boolean;
  text: Messages["plan"]["composer"];
  rows?: number;
  onChange: (value: string) => void;
  onSend: () => void;
};

const SPEECH_LANGUAGE = { id: "id-ID", en: "en-US" };

export default function Composer({ value, disabled, text, rows = 1, onChange, onSend }: ComposerProps) {
  const locale = useLocale();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const spokenBaseRef = useRef("");
  const dictation = useDictation({
    language: SPEECH_LANGUAGE[locale],
    onTranscript: (transcript) => {
      const base = spokenBaseRef.current;
      onChange(base ? `${base} ${transcript}` : transcript);
    },
  });
  const canSend = value.trim() !== "" && !disabled;
  const stacked = rows > 1;

  useEffect(() => {
    const field = fieldRef.current;
    if (!field || dictation.listening) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [value, dictation.listening]);

  const toggleDictation = () => {
    if (dictation.listening) {
      dictation.stop();
      return;
    }
    spokenBaseRef.current = value.trim();
    dictation.start();
  };

  const submit = () => {
    if (!canSend) return;
    if (dictation.listening) dictation.stop();
    onSend();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    submit();
  };

  return (
    <form onSubmit={handleSubmit} className="min-w-0">
      <label htmlFor="plan-composer" className="sr-only">
        {text.label}
      </label>
      <div
        className={`flex gap-1 rounded-3xl border border-border-strong bg-background p-1 shadow-lg shadow-neutral-950/10 transition-colors duration-150 focus-within:border-transparent focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-primary ${
          stacked ? "flex-wrap justify-end" : "items-end"
        }`}
      >
        {dictation.listening && (
          <div
            className={`flex min-w-0 motion-safe:animate-message-in ${
              stacked
                ? "min-h-32 w-full flex-col items-center justify-center gap-1 px-4 text-center"
                : "min-h-11 flex-1 items-center gap-3 pl-1"
            }`}
          >
            <VoiceOrb activity={dictation.activity} hearing={dictation.hearing} compact={!stacked} />
            <div className={stacked ? "w-full min-w-0" : "min-w-0 flex-1"}>
              <p role="status" className="text-label text-primary">
                {dictation.hearing ? text.hearing : text.listening}
              </p>
              {value ? (
                <p dir="rtl" className={`truncate text-body text-text ${stacked ? "text-center" : "text-left"}`}>
                  <bdi dir="ltr">{value}</bdi>
                </p>
              ) : (
                <p className={`text-body text-text-muted ${stacked ? "" : "truncate"}`}>{text.listeningHint}</p>
              )}
            </div>
          </div>
        )}
        <textarea
          ref={fieldRef}
          id="plan-composer"
          rows={rows}
          value={value}
          disabled={disabled}
          placeholder={text.placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className={`max-h-40 min-h-11 resize-none bg-transparent py-2 pr-2 pl-4 text-body leading-7 text-text outline-none [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin] placeholder:text-text-muted ${
            stacked ? "w-full" : "flex-1"
          } ${dictation.listening ? "hidden" : ""}`}
        />
        <button
            type="button"
            disabled={disabled}
            aria-pressed={dictation.listening}
            aria-label={dictation.listening ? text.voiceStop : text.voiceStart}
            title={dictation.listening ? text.voiceStop : text.voiceStart}
            onClick={toggleDictation}
            className={`inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.97] ${
              dictation.listening ? "bg-error text-on-error" : "text-text-muted hover:bg-surface-muted hover:text-text"
            } ${!dictation.supported ? "hidden" : ""}`}>
            {dictation.listening ? (
              <Square className="size-4" fill="currentColor" aria-hidden="true" />
            ) : (
              <Mic className="size-5" aria-hidden="true" />
            )}
          </button>
        <button
          type="submit"
          disabled={!canSend}
          aria-label={text.send}
          className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-on-primary transition-[background-color,scale,opacity] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SendHorizontal className="size-5" aria-hidden="true" />
        </button>
      </div>
      {dictation.error && (
        <p role="alert" className="mt-2 text-body-sm text-error">
          {text.voiceErrors[dictation.error]}
        </p>
      )}
      <p className="mt-2 hidden text-center text-caption text-text-muted md:block">{text.hint}</p>
    </form>
  );
}
