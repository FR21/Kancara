"use client";

import type { Dispatch } from "react";
import type { Messages } from "@/lib/messages";
import type { PlanDraft, PlanDraftAction } from "@/lib/plan-draft";
import type { QuestionKey } from "@/lib/plan-questions";
import CrewGrid from "./CrewGrid";
import ExtrasEditor from "./ExtrasEditor";
import { BudgetEditor, DatesEditor, DestinationsEditor, OriginEditor, PaceEditor } from "./PassEditors";

type QuestionAnswerProps = {
  question: QuestionKey;
  draft: PlanDraft;
  dispatch: Dispatch<PlanDraftAction>;
  text: Messages["plan"];
  selectedMemberId: string | null;
  inlineMemberPanel: boolean;
  onSelectMember: (id: string | null) => void;
  onPicked: () => void;
};

export default function QuestionAnswer({
  question,
  draft,
  dispatch,
  text,
  selectedMemberId,
  inlineMemberPanel,
  onSelectMember,
  onPicked,
}: QuestionAnswerProps) {
  const editorProps = { draft, dispatch, text };

  if (question === "trip") {
    return (
      <div className="space-y-6">
        <OriginEditor {...editorProps} />
        <DestinationsEditor {...editorProps} />
        <DatesEditor {...editorProps} />
        <PaceEditor {...editorProps} />
      </div>
    );
  }
  if (question === "crew") {
    return (
      <CrewGrid
        {...editorProps}
        selectedId={selectedMemberId}
        inlinePanel={inlineMemberPanel}
        onSelect={onSelectMember}
      />
    );
  }
  if (question === "budget") return <BudgetEditor {...editorProps} onPicked={onPicked} />;
  return <ExtrasEditor {...editorProps} />;
}
