"use client";

import { ArrowRight, Ticket } from "lucide-react";
import { type Dispatch, type ReactNode, useEffect, useRef } from "react";
import type { Messages } from "@/lib/messages";
import { type PlanDraft, type PlanDraftAction, fillTemplate } from "@/lib/plan-draft";
import { type QuestionKey, isAnswered, isOptional, missingIn } from "@/lib/plan-questions";
import { useLocale } from "@/lib/use-locale";
import CaptainNote from "./CaptainNote";
import RouteSketch from "./RouteSketch";
import DeckFooter, { FORWARD_ARROW } from "./DeckFooter";
import MemberEditor from "./MemberEditor";
import QuestionAnswer from "./QuestionAnswer";
import { GHOST_BUTTON, PRIMARY_BUTTON, TEXT_LINK } from "@/components/ui/styles";

type QuestionDeckProps = {
  draft: PlanDraft;
  dispatch: Dispatch<PlanDraftAction>;
  text: Messages["plan"];
  questions: QuestionKey[];
  index: number;
  returnLabel: string | null;
  isDesktop: boolean;
  selectedMemberId: string | null;
  /** Shown under the members in the group step. */
  crewFooter?: ReactNode;
  onIndexChange: (index: number) => void;
  onBackToStory: () => void;
  onFinish: () => void;
  onSelectMember: (id: string | null) => void;
  /** Opens the boarding pass as it stands. Null for a question opened from the pass itself. */
  onPreviewPass: (() => void) | null;
};

export default function QuestionDeck({
  draft,
  dispatch,
  text,
  questions,
  index,
  returnLabel,
  isDesktop,
  selectedMemberId,
  crewFooter,
  onIndexChange,
  onBackToStory,
  onFinish,
  onSelectMember,
  onPreviewPass,
}: QuestionDeckProps) {
  const locale = useLocale();
  const headingRef = useRef<HTMLHeadingElement>(null);
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
    />
  );

  return (
    <div className="space-y-8">
      <section
        key={question}
        aria-labelledby="deck-question"
        className={`motion-safe:animate-message-in lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-x-16 ${
          isCrew ? "lg:items-stretch" : "lg:items-start"
        }`}
      >
        <div className="min-w-0">
          <h1
            id="deck-question"
            ref={headingRef}
            tabIndex={-1}
            className="text-h2 text-balance text-text outline-none sm:text-h1"
          >
            {copy.title}
          </h1>
          {copy.hint && <CaptainNote className="mt-4">{copy.hint}</CaptainNote>}
          {/* The pass so far, one quiet link in the question's own heading group rather than a button of its own. */}
          {onPreviewPass && (
            <button type="button" onClick={onPreviewPass} className={`${TEXT_LINK} mt-2`}>
              <Ticket className="size-4" aria-hidden="true" />
              {text.deck.seePass}
            </button>
          )}
          {question === "trip" && isDesktop && (
            <div className="mt-8">
              <RouteSketch origin={draft.origin} destinations={draft.destinations} locale={locale} label={text.deck.routeSketch} />
            </div>
          )}
          {isCrew && (
            <>
              <div className="mt-8">{answer}</div>
              {crewFooter && <div className="mt-8">{crewFooter}</div>}
            </>
          )}
        </div>

        <div className={`mt-8 min-w-0 lg:mt-0 ${isCrew && isDesktop ? "relative min-h-96" : ""}`}>
          {!isCrew && answer}
          {isCrew && isDesktop && selectedMember && (
            // The frame and the scroller are two boxes: the frame clips the corners, and the scroller starts and
            // ends a corner's radius in from the edges, so its scrollbar runs along the straight side only.
            <div
              key={selectedMember.id}
              className="absolute inset-0 overflow-clip rounded-surface border border-primary bg-surface motion-safe:animate-message-in"
            >
              <div className="absolute inset-x-0 inset-y-[calc(var(--surface-pad)+0.5rem)] overflow-y-auto overscroll-contain px-surface [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]">
                <MemberEditor
                  member={selectedMember}
                  draft={draft}
                  dispatch={dispatch}
                  text={text}
                  onRemoved={() => onSelectMember(null)}
                />
              </div>
            </div>
          )}
          {isCrew && isDesktop && !selectedMember && (
            <p className="absolute inset-0 flex items-center justify-center rounded-surface border border-dashed border-border-strong p-surface text-center text-body text-pretty text-text-muted">
              {draft.members.length > 0 ? text.crew.selectHint : text.crew.empty}
            </p>
          )}
        </div>
      </section>

      <DeckFooter
        backLabel={text.deck.back}
        onBack={single ? null : goBack}
        note={blocked ? requiredHint : null}
        noteId="deck-required"
      >
        {canSkip ? (
          <button type="button" onClick={goNext} className={`group ${GHOST_BUTTON} -mr-4`}>
            {isLast ? finishLabel : text.deck.skip}
            <ArrowRight className={FORWARD_ARROW} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            disabled={blocked}
            aria-describedby={blocked ? "deck-required" : undefined}
            onClick={goNext}
            className={`group ${PRIMARY_BUTTON}`}
          >
            {forwardLabel}
            <ArrowRight className={FORWARD_ARROW} aria-hidden="true" />
          </button>
        )}
      </DeckFooter>
    </div>
  );
}
