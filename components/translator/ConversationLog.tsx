import { Languages, Lightbulb, Loader2 } from "lucide-react";
import { type CSSProperties, useEffect, useRef } from "react";
import EmptyState from "@/components/ui/EmptyState";
import SpeakButton from "@/components/ui/SpeakButton";
import { buttonClass } from "@/components/ui/styles";
import { type TranslationContext, TRANSLATION_CONTEXTS } from "@/lib/client/translator";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import type { Speaker } from "./use-voice-input";

export type ConversationTurnView = {
  id: string;
  speaker: Speaker;
  originalText: string;
  translatedText: string;
  romanized: string;
  /** BCP-47 tag of the translation's language, for reading it aloud and for the right font. */
  translatedTag: string;
  politenessLevel: string;
  culturalTip: string;
};

type QuickPhrase = { label: string; text: string; context: TranslationContext };

type ConversationLogProps = {
  turns: ConversationTurnView[];
  translating: boolean;
  speakingId: string | null;
  onSpeak: (turn: ConversationTurnView) => void;
  onQuickPhrase: (phrase: QuickPhrase) => void;
  travelerName: string;
  localName: string;
  text: Messages["translator"];
};

// The conversation so far, straight on the page: the traveler's turns on the right in primary, the other side's on
// the left, each with its translation large enough to hold up to the other person.
export default function ConversationLog({ turns, translating, speakingId, onSpeak, onQuickPhrase, travelerName, localName, text }: ConversationLogProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
  }, [turns.length, translating]);

  if (turns.length === 0) {
    return (
      <EmptyState
        icon={Languages}
        title={text.empty.title}
        body={fillTemplate(text.empty.hint, { traveler: travelerName, local: localName })}
        framed={false}
        headingLevel={2}
        action={
          <div className="flex flex-col items-center">
            <h3 className="text-label text-text">{text.empty.quickTitle}</h3>
            <ul className="mt-3 flex max-w-xl flex-wrap justify-center gap-2">
              {text.quickPhrases.map((phrase, index) => (
                <li key={phrase.label} style={{ "--item-index": index } as CSSProperties} className="motion-safe:animate-list-in">
                  <button
                    type="button"
                    disabled={translating}
                    onClick={() => onQuickPhrase({ ...phrase, context: TRANSLATION_CONTEXTS.find((context) => context === phrase.context) ?? "general" })}
                    className={buttonClass("outline", "small")}
                  >
                    {phrase.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        }
      />
    );
  }

  return (
    <div>
      <ol aria-label={text.logLabel} className="space-y-4">
        {turns.map((turn) => {
          const mine = turn.speaker === "traveler";
          return (
            <li key={turn.id} className={`flex motion-safe:animate-message-in ${mine ? "justify-end" : "justify-start"}`}>
              {/* A compact surface, its corner nearest the speaker tightened to the inner corner: the bubble's tail. */}
              <div
                className={`surface-compact max-w-[90%] rounded-t-surface p-surface sm:max-w-[80%] ${
                  mine ? "rounded-bl-surface rounded-br-lg bg-primary text-on-primary" : "rounded-br-surface rounded-bl-lg bg-surface-muted text-text"
                }`}
              >
                <p className="text-caption font-bold opacity-80">{mine ? travelerName : localName}</p>
                {turn.originalText && <p className="mt-1 text-body-sm opacity-90">{turn.originalText}</p>}
                <p lang={turn.translatedTag} className="mt-2 text-h3 text-pretty">
                  {turn.translatedText}
                </p>
                {turn.romanized && turn.romanized !== turn.translatedText && (
                  <p className="mt-1 text-body-sm opacity-90">{fillTemplate(text.pronunciation, { romanized: turn.romanized })}</p>
                )}
                {turn.culturalTip && (
                  <p className={`mt-3 flex items-start gap-2 border-l pl-3 text-body-sm text-pretty ${mine ? "border-on-primary/60" : "border-primary"}`}>
                    <span aria-hidden="true" className="flex h-5 shrink-0 items-center">
                      <Lightbulb className="size-4" />
                    </span>
                    {turn.culturalTip}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <SpeakButton
                    label={text.play}
                    speakingLabel={text.playing}
                    speaking={speakingId === turn.id}
                    onSpeak={() => onSpeak(turn)}
                    variant={mine ? "inverse" : "outline"}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {translating && (
        <p role="status" className="mt-4 flex items-center gap-2 text-body-sm text-text-muted">
          <Loader2 className="size-4 text-primary motion-safe:animate-spin" aria-hidden="true" />
          {text.translating}
        </p>
      )}
      <div ref={endRef} />
    </div>
  );
}
