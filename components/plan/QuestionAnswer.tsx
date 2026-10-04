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

  if (question === "destination") return <DestinationsEditor {...editorProps} />;
  if (question === "origin") return <OriginEditor {...editorProps} />;
  if (question === "dates") return <DatesEditor {...editorProps} />;
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
  if (question === "pace") return <PaceEditor {...editorProps} onPicked={onPicked} />;
  return <ExtrasEditor {...editorProps} />;
}
