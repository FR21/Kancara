"use client";

import { ArrowRight } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import type { Messages } from "@/lib/messages";
import type { PlanDraft } from "@/lib/plan-draft";
import { type QuestionKey, missingRequired } from "@/lib/plan-questions";
import { buttonClass } from "@/components/ui/styles";
import { FORWARD_ARROW } from "./DeckFooter";
import GroupLines from "./GroupLines";
import TicketCard from "./TicketCard";

type PassDialogProps = {
  open: boolean;
  draft: PlanDraft;
  text: Messages["plan"];
  onClose: () => void;
  onEdit?: (question: QuestionKey, memberId?: string) => void;
  onAddMember?: () => void;
};

// The boarding pass preview dialog: matches the authentic full boarding pass template from TicketReview.
// Includes wide horizontal airline ticket styling, group transit lines, raised tactile paper drop-shadow,
// and direct interactive editing.
export default function PassDialog({ open, draft, text, onClose, onEdit, onAddMember }: PassDialogProps) {
  const ready = missingRequired(draft).length === 0;
  const ticket = text.ticket;

  return (
    <Sheet
      open={open}
      size="wide"
      title={ready ? ticket.readyTitle : ticket.draftTitle}
      closeLabel={text.deck.previewClose}
      onClose={onClose}
    >
      <div className="space-y-6">
        {draft.members.length > 0 && (
          <GroupLines members={draft.members} text={text} destination={text.stages.pass} />
        )}

        <TicketCard
          draft={draft}
          text={text}
          raised
          arriving
          onEdit={onEdit}
          onAddMember={onAddMember}
        >
          <div className="flex flex-col gap-2">
            <p className="px-2 text-center text-caption text-pretty text-text-muted">{text.deck.previewNote}</p>
            <button
              type="button"
              onClick={onClose}
              className={`group ${buttonClass("primary", "medium")} w-full`}
            >
              {text.deck.next}
              <ArrowRight className={FORWARD_ARROW} aria-hidden="true" />
            </button>
          </div>
        </TicketCard>
      </div>
    </Sheet>
  );
}
