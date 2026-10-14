"use client";

import Sheet from "@/components/ui/Sheet";
import type { Messages } from "@/lib/messages";
import type { PlanDraft } from "@/lib/plan-draft";
import TicketCard from "./TicketCard";

type PassDialogProps = {
  open: boolean;
  draft: PlanDraft;
  text: Messages["plan"];
  onClose: () => void;
};

// The boarding pass as it stands, opened from any question without leaving it. It lies flat on the sheet, and the
// pass lays itself out by the sheet's width, so the stub sits under the fields here.
export default function PassDialog({ open, draft, text, onClose }: PassDialogProps) {
  return (
    <Sheet open={open} title={text.deck.previewTitle} closeLabel={text.deck.previewClose} onClose={onClose}>
      <TicketCard draft={draft} text={text} raised={false}>
        <p className="px-2 text-caption text-pretty text-text-muted">{text.deck.previewNote}</p>
      </TicketCard>
    </Sheet>
  );
}
