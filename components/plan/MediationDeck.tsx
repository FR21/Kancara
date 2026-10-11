"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { type Conflict, chosenOption, countSettled, suggestAgreements } from "@/lib/mediation";
import type { Messages } from "@/lib/messages";
import { type OptionKey, type PlanDraft, fillTemplate } from "@/lib/plan-draft";
import ClashSides from "./ClashSides";
import GiveLedger from "./GiveLedger";
import MediationChoices from "./MediationChoices";
import { clashTitle } from "./mediation-text";
import { GHOST_BUTTON, PRIMARY_BUTTON } from "./styles";

type MediationDeckProps = {
  draft: PlanDraft;
  conflicts: Conflict[];
  index: number;
  text: Messages["plan"];
  hasPlan: boolean;
  busy: boolean;
  onIndexChange: (index: number) => void;
  onPick: (conflict: string, option: OptionKey) => void;
  onBack: () => void;
  onFinish: () => void;
};

// Where the group's wishes clash, one clash per screen, the way the questions were asked. Each is settled by
// picking a middle ground with its trade in view; nothing here is decided by counting heads.
export default function MediationDeck({
  draft,
  conflicts,
  index,
  text,
  hasPlan,
  busy,
  onIndexChange,
  onPick,
  onBack,
  onFinish,
}: MediationDeckProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const conflict = conflicts[index];
  const copy = text.mediation;
  const picked = chosenOption(conflict, draft.agreements);
  const isLast = index === conflicts.length - 1;
  const allSettled = countSettled(conflicts, draft.agreements) === conflicts.length;
  const blocked = picked === null || (isLast && !allSettled);
  // Captain's pick answers what was chosen on the other screens: whoever gave way there is spared here.
  const others = Object.fromEntries(Object.entries(draft.agreements).filter(([id]) => id !== conflict.id));
  const suggested = suggestAgreements(conflicts, others)[conflict.id] ?? null;
  const hint =
    conflict.kind === "time"
      ? fillTemplate(copy.hints.time, { wishes: conflict.wishes.length, slots: conflict.slots })
      : copy.hints[conflict.kind];
  const finishLabel = hasPlan ? text.ticket.remake : text.ticket.makePlan;
  const note =
    picked === null ? copy.pickFirst : fillTemplate(copy.progress, { current: index + 1, total: conflicts.length });

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [conflict.id]);

  const goBack = () => {
    if (index === 0) {
      onBack();
      return;
    }
    onIndexChange(index - 1);
  };

  const goNext = () => {
    if (isLast) {
      onFinish();
      return;
    }
    onIndexChange(index + 1);
  };

  return (
    <div className="space-y-8">
      <section
        key={conflict.id}
        aria-labelledby="clash-title"
        className="motion-safe:animate-message-in rounded-2xl bg-surface/50 p-6 shadow-sm ring-1 ring-border/50 backdrop-blur-xl sm:p-10 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16"
      >
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <h1
            id="clash-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-h1 font-bold tracking-tight text-balance text-text outline-none lg:text-4xl"
          >
            {clashTitle(conflict, text)}
          </h1>
          <p className="mt-4 text-body leading-relaxed text-text-muted">{hint}</p>
          <div className="mt-8">
            <ClashSides conflict={conflict} draft={draft} text={text} />
          </div>
        </div>

        <div className="mt-8 min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0">
          <MediationChoices
            conflict={conflict}
            draft={draft}
            text={text}
            picked={picked?.key ?? null}
            suggested={suggested}
            onPick={(option) => onPick(conflict.id, option)}
          />
        </div>

        <div className="mt-8 min-w-0 border-t border-border pt-8 lg:col-start-1 lg:row-start-2">
          <GiveLedger conflicts={conflicts} draft={draft} text={text} />
        </div>
      </section>

      <div className="safe-bottom sticky bottom-0 -mx-4 border-t border-border bg-background px-4 pt-3 sm:mx-0 sm:px-0">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={goBack} className={`${GHOST_BUTTON} -ml-4 sm:ml-0`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {text.deck.back}
          </button>
          <div className="flex min-w-0 items-center gap-4">
            <p className="hidden text-body-sm text-text-muted tabular-nums sm:block">{note}</p>
            <button
              type="button"
              disabled={blocked || (isLast && busy)}
              aria-describedby={picked === null ? "clash-required" : undefined}
              onClick={goNext}
              className={PRIMARY_BUTTON}
            >
              {isLast ? finishLabel : text.deck.next}
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <p id="clash-required" className="pt-2 text-center text-body-sm text-text-muted tabular-nums sm:hidden">
          {note}
        </p>
      </div>
    </div>
  );
}
