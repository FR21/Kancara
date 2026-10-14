import { ArrowUp, Mic, Square } from "lucide-react";
import { iconButtonClass } from "@/components/ui/styles";
import type { FormEvent } from "react";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { MAX_TEXT_CHARS } from "@/lib/client/translator";
import type { VoiceMode } from "./use-voice-input";

type SpeakerComposerProps = {
  id: string;
  /** Who talks here and in which language, e.g. "Kamu, Bahasa Indonesia". */
  label: string;
  /** BCP-47 tag of the language typed here, so the phone offers the right keyboard and spell checking. */
  languageTag: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onMic: () => void;
  listening: boolean;
  elapsedSeconds: number;
  busy: boolean;
  voiceMode: VoiceMode;
  text: Messages["translator"]["composer"];
};

// The round buttons that sit inside the composer's pill. They take the field's height less its inset, so the
// field and its buttons read as one control; IconButton has no filled tone for the send button.

// One side's way to talk: a field with the microphone and send buttons inside it, all one pill, so the field and
// its buttons read as one control. While listening, the microphone turns into a stop button, and the field shows
// what is heard as it is heard, so it is held read-only rather than greyed out.
export default function SpeakerComposer({
  id,
  label,
  languageTag,
  placeholder,
  value,
  onChange,
  onSend,
  onMic,
  listening,
  elapsedSeconds,
  busy,
  voiceMode,
  text,
}: SpeakerComposerProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (value.trim() && !busy && !listening) onSend();
  };
  const micLabel = listening ? text.stop : text.speak;

  return (
    <form onSubmit={submit} className="min-w-0">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3">
        <label htmlFor={id} className="text-label text-text">
          {label}
        </label>
        {listening && (
          <p role="status" className="flex items-center gap-2 text-caption font-bold text-error tabular-nums">
            <span className="size-2 rounded-full bg-error motion-safe:animate-pulse" aria-hidden="true" />
            {fillTemplate(voiceMode === "recording" ? text.recording : text.listening, { seconds: elapsedSeconds })}
          </p>
        )}
      </div>
      <div
        className={`mt-1 flex items-center gap-1 rounded-full border bg-background p-1 transition-[border-color] duration-150 ease-out focus-within:border-primary has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-primary ${
          listening ? "border-error" : "border-border-strong"
        }`}
      >
        <input
          id={id}
          type="text"
          lang={languageTag}
          enterKeyHint="send"
          autoComplete="off"
          maxLength={MAX_TEXT_CHARS}
          value={value}
          disabled={busy}
          readOnly={listening}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 min-w-0 flex-1 bg-transparent pl-3 text-body text-text outline-none placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-40"
        />
        {voiceMode !== "none" && (
          <button
            type="button"
            onClick={onMic}
            disabled={busy}
            aria-label={micLabel}
            title={micLabel}
            aria-pressed={listening}
            className={iconButtonClass(listening ? "danger" : "plain")}
          >
            {listening ? <Square className="size-4" fill="currentColor" aria-hidden="true" /> : <Mic className="size-5" aria-hidden="true" />}
          </button>
        )}
        <button type="submit" disabled={busy || listening || !value.trim()} aria-label={text.send} title={text.send} className={iconButtonClass("primary")}>
          <ArrowUp className="size-5" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
