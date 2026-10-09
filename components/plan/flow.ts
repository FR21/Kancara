export const STAGES = ["story", "details", "pass", "plan"] as const;
export type Stage = (typeof STAGES)[number];
