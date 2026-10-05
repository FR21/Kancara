"use client";

import { ArrowRight } from "lucide-react";
import type { Messages } from "@/lib/messages";
import type { PlanDraft } from "@/lib/plan-draft";
import { type QuestionKey, missingRequired } from "@/lib/plan-questions";
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from "./styles";
import TicketCard from "./TicketCard";

type TicketReviewProps = {
  draft: PlanDraft;
  text: Messages["plan"];
  hasPlan: boolean;
  busy: boolean;
  onEdit: (question: QuestionKey, memberId?: string) => void;
  onAddMember: () => void;
  onMakePlan: () => void;
  onViewPlan: () => void;
};

export default function TicketReview({
  draft,
  text,
  hasPlan,
  busy,
  onEdit,
  onAddMember,
  onMakePlan,
  onViewPlan,
}: TicketReviewProps) {
  const ticket = text.ticket;
  const ready = missingRequired(draft).length === 0;

  return (
    <div className="space-y-8">
      <div className="text-center lg:text-left">
        <h1 tabIndex={-1} className="text-h2 text-balance text-text outline-none lg:text-h1">
          {ready ? ticket.readyTitle : ticket.draftTitle}
        </h1>
        <p className="mt-2 text-body text-text-muted">{ticket.hint}</p>
      </div>

      <TicketCard draft={draft} text={text} arriving onEdit={onEdit} onAddMember={onAddMember}>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={!ready || busy}
            onClick={onMakePlan}
            className={`${PRIMARY_BUTTON} h-14 w-full px-4 whitespace-nowrap shadow-md shadow-primary/20 disabled:shadow-none`}
          >
            {hasPlan ? ticket.remake : ticket.makePlan}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
          {hasPlan && (
            <button type="button" onClick={onViewPlan} className={`${OUTLINE_BUTTON} w-full`}>
              {ticket.viewPlan}
            </button>
          )}
        </div>
      </TicketCard>
    </div>
  );
}
