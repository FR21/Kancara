"use client";

import { ArrowRight } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import type { Messages } from "@/lib/messages";
import type { PlanDraft } from "@/lib/plan-draft";
import { type QuestionKey, missingRequired } from "@/lib/plan-questions";
import { FORWARD_ARROW } from "./DeckFooter";
import GroupLines from "./GroupLines";
import { OUTLINE_BUTTON, buttonClass } from "@/components/ui/styles";
import TicketCard from "./TicketCard";

type TicketReviewProps = {
  draft: PlanDraft;
  text: Messages["plan"];
  hasPlan: boolean;
  busy: boolean;
  /** Wishes in the group clash, so the way on leads through finding the middle ground. */
  hasClashes: boolean;
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
  hasClashes,
  onEdit,
  onAddMember,
  onMakePlan,
  onViewPlan,
}: TicketReviewProps) {
  const ticket = text.ticket;
  const ready = missingRequired(draft).length === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        titleId="pass-title"
        title={ready ? ticket.readyTitle : ticket.draftTitle}
        lead={ready && hasClashes ? ticket.meetHint : ticket.hint}
      />

      <GroupLines members={draft.members} text={text} destination={text.stages.pass} />

      <TicketCard draft={draft} text={text} arriving onEdit={onEdit} onAddMember={onAddMember}>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={!ready || busy}
            onClick={onMakePlan}
            className={`group ${buttonClass("primary", "large")} w-full text-center`}
          >
            <span>{hasClashes ? ticket.toMeet : hasPlan ? ticket.remake : ticket.makePlan}</span>
            <ArrowRight className={FORWARD_ARROW} aria-hidden="true" />
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
