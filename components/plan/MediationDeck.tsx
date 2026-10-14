"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { type Conflict, chosenOption, countSettled, suggestAgreements } from "@/lib/mediation";
import type { Messages } from "@/lib/messages";
import { type OptionKey, type PlanDraft, fillTemplate } from "@/lib/plan-draft";
import CaptainNote from "./CaptainNote";
import ClashSides from "./ClashSides";
import GiveLedger from "./GiveLedger";
import MediationChoices from "./MediationChoices";
import DeckFooter, { FORWARD_ARROW } from "./DeckFooter";
import { clashTitle } from "./mediation-text";
import { PRIMARY_BUTTON } from "@/components/ui/styles";

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
        className="motion-safe:animate-message-in lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16"
      >
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <h1
            id="clash-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-h2 text-balance text-text outline-none sm:text-h1"
          >
            {clashTitle(conflict, text)}
          </h1>
          <CaptainNote className="mt-4">{hint}</CaptainNote>
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

        <div className="mt-8 min-w-0 lg:col-start-1 lg:row-start-2">
          <GiveLedger conflicts={conflicts} draft={draft} text={text} />
        </div>
      </section>

      <DeckFooter backLabel={text.deck.back} onBack={goBack} note={note} noteId="clash-note">
        <button
          type="button"
          disabled={blocked || (isLast && busy)}
          aria-describedby={picked === null ? "clash-note" : undefined}
          onClick={goNext}
          className={`group ${PRIMARY_BUTTON}`}
        >
          {isLast ? finishLabel : text.deck.next}
          <ArrowRight className={FORWARD_ARROW} aria-hidden="true" />
        </button>
      </DeckFooter>
    </div>
  );
}
