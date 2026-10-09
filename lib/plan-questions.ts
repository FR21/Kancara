import { type PassField, type PlanDraft, countFilledDetails, missingFields } from "@/lib/plan-draft";

export const QUESTIONS = ["trip", "crew", "budget", "extras"] as const;
export type QuestionKey = (typeof QUESTIONS)[number];

// The required parts of the boarding pass each question fills in. The route, the dates, and the pace are asked
// together; extras are optional and have none.
const FIELDS: Record<QuestionKey, PassField[]> = {
  trip: ["route", "dates", "pace"],
  crew: ["group"],
  budget: ["budget"],
  extras: [],
};

export function isOptional(question: QuestionKey): boolean {
  return FIELDS[question].length === 0;
}

/** The required parts of a question that are still empty. */
export function missingIn(question: QuestionKey, draft: PlanDraft): PassField[] {
  const missing = missingFields(draft);
  return FIELDS[question].filter((field) => missing.includes(field));
}

export function isAnswered(question: QuestionKey, draft: PlanDraft): boolean {
  if (isOptional(question)) return countFilledDetails(draft) > 0;
  return missingIn(question, draft).length === 0;
}

export function missingRequired(draft: PlanDraft): QuestionKey[] {
  return QUESTIONS.filter((question) => !isOptional(question) && !isAnswered(question, draft));
}

export function nextRequired(draft: PlanDraft): QuestionKey | null {
  return missingRequired(draft)[0] ?? null;
}
