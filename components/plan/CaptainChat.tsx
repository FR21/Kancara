"use client";

import { ArrowRight, CalendarDays, Users } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useEffect, useRef } from "react";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import type { QuestionKey } from "@/lib/plan-questions";
import Composer from "./Composer";
import ErrorAlert from "./ErrorAlert";
import type { ChatMessage } from "./flow";
import { PRIMARY_BUTTON, QUICK_CHIP } from "./styles";

type CaptainChatProps = {
  text: Messages["plan"];
  messages: ChatMessage[];
  asking: QuestionKey | null;
  busy: boolean;
  failed: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: (story: string) => void;
  onRetry: () => void;
  onAnswerManually: (question: QuestionKey) => void;
  onContinue: () => void;
};

const BUDGET_MILLIONS = [5, 10, 30];
const TYPING_DELAYS = ["0ms", "150ms", "300ms"];

function CaptainRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-end gap-2 motion-safe:animate-message-in">
      <Image
        src="/images/logo/kancara_mascot_captain_logo.webp"
        alt=""
        width={500}
        height={500}
        sizes="40px"
        className="-mb-1 size-10 shrink-0"
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function CaptainChat({
  text,
  messages,
  asking,
  busy,
  failed,
  input,
  onInputChange,
  onSend,
  onRetry,
  onAnswerManually,
  onContinue,
}: CaptainChatProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const idle = !busy && !failed;
  const complete = asking === null;

  useEffect(() => {
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ block: "end", behavior: reduceMotion ? "auto" : "smooth" });
  }, [messages.length, busy, failed]);

  return (
    <div className="flex min-h-[50dvh] flex-col">
      <h1 tabIndex={-1} className="sr-only">
        {text.mode.captain}
      </h1>
      <div role="log" aria-live="polite" aria-label={text.chat.logLabel} className="flex-1 space-y-4 pb-4">
        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end motion-safe:animate-message-in">
              <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-body text-on-primary lg:max-w-[60%]">
                <span className="sr-only">{text.chat.you}: </span>
                {message.text}
              </p>
            </div>
          ) : (
            <CaptainRow key={message.id}>
              <p className="inline-block max-w-[90%] rounded-2xl rounded-bl-sm bg-surface-muted px-4 py-3 text-body text-text lg:max-w-[60%]">
                <span className="sr-only">{text.chat.captain}: </span>
                {message.text}
              </p>
            </CaptainRow>
          ),
        )}

        {busy && (
          <CaptainRow>
            <p className="inline-flex h-11 items-center gap-1 rounded-2xl rounded-bl-sm bg-surface-muted px-4">
              <span className="sr-only">{text.chat.typing}</span>
              {TYPING_DELAYS.map((delay) => (
                <span
                  key={delay}
                  aria-hidden="true"
                  style={{ animationDelay: delay }}
                  className="size-2 rounded-full bg-text-muted motion-safe:animate-typing"
                />
              ))}
            </p>
          </CaptainRow>
        )}

        {failed && <ErrorAlert message={text.chat.error} retryLabel={text.chat.retry} onRetry={onRetry} />}

        {idle && asking === "budget" && (
          <div className="flex flex-wrap gap-2 pl-12 motion-safe:animate-message-in">
            {BUDGET_MILLIONS.map((millions) => {
              const label = fillTemplate(text.chat.quickBudget, { millions });
              return (
                <button key={millions} type="button" onClick={() => onSend(label)} className={QUICK_CHIP}>
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {idle && asking === "pace" && (
          <div className="flex flex-wrap gap-2 pl-12 motion-safe:animate-message-in">
            <button type="button" onClick={() => onSend(text.paces.relaxed)} className={QUICK_CHIP}>
              {text.paces.relaxed}
            </button>
            <button type="button" onClick={() => onSend(text.paces.packed)} className={QUICK_CHIP}>
              {text.paces.packed}
            </button>
          </div>
        )}

        {idle && asking === "dates" && (
          <div className="pl-12 motion-safe:animate-message-in">
            <button type="button" onClick={() => onAnswerManually("dates")} className={QUICK_CHIP}>
              <CalendarDays className="size-4 text-primary" aria-hidden="true" />
              {text.chat.pickDates}
            </button>
          </div>
        )}

        {idle && asking === "crew" && (
          <div className="pl-12 motion-safe:animate-message-in">
            <button type="button" onClick={() => onAnswerManually("crew")} className={QUICK_CHIP}>
              <Users className="size-4 text-primary" aria-hidden="true" />
              {text.chat.editCrew}
            </button>
          </div>
        )}

        {idle && complete && (
          <div className="pl-12 motion-safe:animate-message-in">
            <button type="button" onClick={onContinue} className={PRIMARY_BUTTON}>
              {text.deck.finish}
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
        <div ref={endRef} className="h-px scroll-mb-40" />
      </div>

      <div className="safe-bottom sticky bottom-0 -mx-4 bg-background px-4 pt-2 sm:mx-0 sm:px-0">
        <Composer
          value={input}
          disabled={busy}
          text={text.composer}
          onChange={onInputChange}
          onSend={() => onSend(input.trim())}
        />
      </div>
    </div>
  );
}
