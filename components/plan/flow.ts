export const STAGES = ["story", "details", "pass", "plan"] as const;
export type Stage = (typeof STAGES)[number];

export type PlanMode = "captain" | "manual";

export type ChatMessage = { id: number; role: "captain" | "user"; text: string };
