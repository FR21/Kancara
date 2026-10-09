import { type PlanDraft, countFilledDetails, hasBudget, hasDateError, hasDates } from "@/lib/plan-draft";

const QUESTION_KEYS = ["destination", "dates", "crew", "budget", "pace", "origin", "extras"] as const;
export type QuestionKey = (typeof QUESTION_KEYS)[number];

const ALWAYS_ASKED: QuestionKey[] = ["crew", "extras"];
const OPTIONAL: QuestionKey[] = ["extras"];

export function isOptional(question: QuestionKey): boolean {
  return OPTIONAL.includes(question);
}

export function isAnswered(question: QuestionKey, draft: PlanDraft): boolean {
  if (question === "destination") return draft.destinations.length > 0;
  if (question === "origin") return draft.origin.trim() !== "";
  if (question === "dates") return hasDates(draft) && !hasDateError(draft);
  if (question === "crew") return draft.members.length > 0;
  if (question === "budget") return hasBudget(draft);
  if (question === "pace") return draft.pace !== null;
  return countFilledDetails(draft) > 0;
}

export function openQuestions(draft: PlanDraft): QuestionKey[] {
  return QUESTION_KEYS.filter((question) => ALWAYS_ASKED.includes(question) || !isAnswered(question, draft));
}

export function missingRequired(draft: PlanDraft): QuestionKey[] {
  return QUESTION_KEYS.filter((question) => !isOptional(question) && !isAnswered(question, draft));
}

export function nextRequired(draft: PlanDraft): QuestionKey | null {
  return missingRequired(draft)[0] ?? null;
}
