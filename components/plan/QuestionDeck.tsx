"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { type Dispatch, useEffect, useRef } from "react";
import type { Messages } from "@/lib/messages";
import { type PlanDraft, type PlanDraftAction, fillTemplate } from "@/lib/plan-draft";
import { type QuestionKey, isAnswered, isOptional } from "@/lib/plan-questions";
import MemberEditor from "./MemberEditor";
import QuestionAnswer from "./QuestionAnswer";
import { EASE, GHOST_BUTTON, PRIMARY_BUTTON } from "./styles";

type QuestionDeckProps = {
  draft: PlanDraft;
  dispatch: Dispatch<PlanDraftAction>;
  text: Messages["plan"];
  questions: QuestionKey[];
  index: number;
  returnLabel: string | null;
  isDesktop: boolean;
  selectedMemberId: string | null;
  onIndexChange: (index: number) => void;
  onBackToStory: () => void;
  onFinish: () => void;
  onSelectMember: (id: string | null) => void;
};

const ADVANCE_MS = 320;

export default function QuestionDeck({
  draft,
  dispatch,
  text,
  questions,
  index,
  returnLabel,
  isDesktop,
  selectedMemberId,
  onIndexChange,
  onBackToStory,
  onFinish,
  onSelectMember,
}: QuestionDeckProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const question = questions[index];
  const single = returnLabel !== null;
  const copy = text.deck.questions[question];
  const isLast = index === questions.length - 1;
  const answered = isAnswered(question, draft);
  const optional = isOptional(question);
  const canSkip = optional && !answered && !single;
  const blocked = !answered && !optional && !single;
  const isCrew = question === "crew";
  const selectedMember = draft.members.find((member) => member.id === selectedMemberId) ?? null;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [question]);

  useEffect(
    () => () => {
      if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current);
    },
    [],
  );

  const goNext = () => {
    if (isLast || single) {
      onFinish();
      return;
    }
    onIndexChange(index + 1);
  };

  const goBack = () => {
    if (index === 0) {
      onBackToStory();
      return;
    }
    onIndexChange(index - 1);
  };

  const advanceSoon = () => {
    if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = window.setTimeout(goNext, ADVANCE_MS);
  };

  const finishLabel = returnLabel ?? text.deck.finish;
  const forwardLabel = isLast || single ? finishLabel : text.deck.next;

  const answer = (
    <QuestionAnswer
      question={question}
      draft={draft}
      dispatch={dispatch}
      text={text}
      selectedMemberId={selectedMemberId}
      inlineMemberPanel={!isDesktop}
      onSelectMember={onSelectMember}
      onPicked={advanceSoon}
    />
  );

  return (
    <div className="space-y-8">
      {!single && (
        <div className="flex items-center gap-4 py-2">
          <div
            role="progressbar"
            aria-label={fillTemplate(text.deck.progress, { current: index + 1, total: questions.length })}
            aria-valuemin={1}
            aria-valuemax={questions.length}
            aria-valuenow={index + 1}
            className="relative h-3 flex-1 overflow-hidden rounded-full bg-surface-muted shadow-inner"
          >
            <div
              style={{ width: `${((index + 1) / questions.length) * 100}%` }}
              className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary-hover shadow-[0_0_10px_rgba(var(--color-primary),0.5)] transition-[width] duration-500 ${EASE} motion-reduce:transition-none`}
            />
          </div>
          <div className="flex h-8 min-w-12 items-center justify-center rounded-full bg-surface-muted px-3 text-label text-text-muted tabular-nums shadow-sm">
            {index + 1}/{questions.length}
          </div>
        </div>
      )}

      <section
        key={question}
        aria-labelledby="deck-question"
        className={`motion-safe:animate-message-in rounded-2xl bg-surface/50 p-6 shadow-sm ring-1 ring-border/50 backdrop-blur-xl sm:p-10 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-x-16 ${
          isCrew ? "lg:items-stretch" : "lg:items-start"
        }`}
      >
        <div className="min-w-0">
          <h1
            id="deck-question"
            ref={headingRef}
            tabIndex={-1}
            className="text-3xl font-bold tracking-tight text-balance text-text outline-none lg:text-4xl"
          >
            {copy.title}
          </h1>
          {copy.hint && <p className="mt-4 text-lg leading-relaxed text-text-muted">{copy.hint}</p>}
          {isCrew && <div className="mt-8">{answer}</div>}
        </div>

        <div className={`mt-8 min-w-0 lg:mt-0 ${isCrew && isDesktop ? "relative min-h-96" : ""}`}>
          {!isCrew && answer}
          {isCrew && isDesktop && selectedMember && (
            <div
              key={selectedMember.id}
              className="absolute inset-0 overflow-y-auto overscroll-contain rounded-lg border border-primary bg-surface p-6 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin] motion-safe:animate-message-in"
            >
              <MemberEditor
                member={selectedMember}
                draft={draft}
                dispatch={dispatch}
                text={text}
                onRemoved={() => onSelectMember(null)}
              />
            </div>
          )}
          {isCrew && isDesktop && !selectedMember && (
            <p className="absolute inset-0 flex items-center justify-center rounded-lg border border-dashed border-border-strong px-6 text-center text-body text-text-muted">
              {draft.members.length > 0 ? text.crew.selectHint : text.crew.empty}
            </p>
          )}
        </div>
      </section>

      <div className="safe-bottom sticky bottom-0 -mx-4 border-t border-border bg-background px-4 pt-3 sm:mx-0 sm:px-0">
        <div className="flex items-center justify-between gap-3">
          {single ? (
            <span />
          ) : (
            <button type="button" onClick={goBack} className={`${GHOST_BUTTON} -ml-4 sm:ml-0`}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              {text.deck.back}
            </button>
          )}
          <div className="flex min-w-0 items-center gap-4">
            {blocked && (
              <p id="deck-required" className="hidden text-body-sm text-text-muted sm:block">
                {text.deck.required}
              </p>
            )}
            {canSkip ? (
              <button type="button" onClick={goNext} className={GHOST_BUTTON}>
                {isLast ? finishLabel : text.deck.skip}
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                disabled={blocked}
                aria-describedby={blocked ? "deck-required" : undefined}
                onClick={goNext}
                className={PRIMARY_BUTTON}
              >
                {forwardLabel}
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        {blocked && <p className="pt-2 text-center text-body-sm text-text-muted sm:hidden">{text.deck.required}</p>}
      </div>
    </div>
  );
}
