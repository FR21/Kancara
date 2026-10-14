export const STAGES = ["story", "details", "pass", "meet", "plan"] as const;
export type Stage = (typeof STAGES)[number];
