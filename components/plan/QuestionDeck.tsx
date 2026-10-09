"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { type Dispatch, useEffect, useRef } from "react";
import type { Messages } from "@/lib/messages";
import { type PlanDraft, type PlanDraftAction, fillTemplate } from "@/lib/plan-draft";
import { type QuestionKey, isAnswered, isOptional, missingIn } from "@/lib/plan-questions";
import { useLocale } from "@/lib/use-locale";
import MemberEditor from "./MemberEditor";
import QuestionAnswer from "./QuestionAnswer";
import { GHOST_BUTTON, PRIMARY_BUTTON } from "./styles";

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
  const locale = useLocale();
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
  // Names what is still empty, since one step can ask for several things.
  const stillMissing = missingIn(question, draft).map((field) => text.ticket.missing[field]);
  const requiredHint = fillTemplate(text.deck.required, {
    items: new Intl.ListFormat(locale, { type: "conjunction" }).format(stillMissing),
  });
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
            className="text-h1 font-bold tracking-tight text-balance text-text outline-none lg:text-4xl"
          >
            {copy.title}
          </h1>
          {copy.hint && <p className="mt-4 text-body leading-relaxed text-text-muted">{copy.hint}</p>}
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
                {requiredHint}
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
        {blocked && <p className="pt-2 text-center text-body-sm text-text-muted sm:hidden">{requiredHint}</p>}
      </div>
    </div>
  );
}
