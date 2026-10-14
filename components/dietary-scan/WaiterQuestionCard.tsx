import { MessagesSquare } from "lucide-react";
import CopyButton from "@/components/ui/CopyButton";
import SpeakButton from "@/components/ui/SpeakButton";
import { BADGE } from "@/components/ui/styles";
import type { WaiterQuestion } from "@/lib/client/dietary-scan";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";

type WaiterQuestionCardProps = {
  question: WaiterQuestion;
  text: Messages["dietaryScan"]["waiter"];
  speakingId: string | null;
  /** Reads `words` aloud in `language` (a name or a BCP-47 tag). */
  onSpeak: (words: string, language: string, id: string) => void;
  /** BCP-47 tag of the reader's own language, for hearing what the question means. */
  readerLanguageTag: string;
};

// The question to ask the staff, large enough to hold up to them, with its sound and its meaning.
export default function WaiterQuestionCard({ question, text, speakingId, onSpeak, readerLanguageTag }: WaiterQuestionCardProps) {
  const sameLanguage = question.translation === question.nativePhrase;
  return (
    <section className="rounded-surface border border-primary bg-primary-subtle p-surface">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 text-h3 text-text">
          <MessagesSquare className="size-5 text-primary" aria-hidden="true" />
          {text.title}
        </h2>
        <span className={`${BADGE} bg-primary text-on-primary`}>{question.language}</span>
      </div>
      <p className="mt-1 text-body-sm text-pretty text-text-muted">{text.hint}</p>

      <p lang={question.languageTag || undefined} className="mt-6 text-h2 text-pretty text-text">
        {question.nativePhrase}
      </p>
      {question.romanized && question.romanized !== question.nativePhrase && (
        <p className="mt-2 text-body-sm text-pretty text-primary">{question.romanized}</p>
      )}
      {question.translation && !sameLanguage && (
        <p className="mt-2 text-body-sm text-pretty text-text-muted">{fillTemplate(text.meaning, { translation: question.translation })}</p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <SpeakButton
          variant="primary"
          label={text.speak}
          speakingLabel={text.speaking}
          speaking={speakingId === "native"}
          onSpeak={() => onSpeak(question.nativePhrase, question.languageTag || question.language, "native")}
        />
        {question.translation && !sameLanguage && (
          <SpeakButton
            label={text.speakMeaning}
            speakingLabel={text.speaking}
            speaking={speakingId === "meaning"}
            onSpeak={() => onSpeak(question.translation, readerLanguageTag, "meaning")}
          />
        )}
        <CopyButton text={question.nativePhrase} label={text.copy} copiedLabel={text.copied} />
      </div>
    </section>
  );
}
