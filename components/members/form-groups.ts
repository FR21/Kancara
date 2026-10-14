// A person's long form (the planner's member editor, a saved profile) reads as a few groups: who they are, what
// they need, what they would like, how to reach them. Fields in a group sit 16px apart; a hairline with 24px on
// either side ends the group, so the gap between groups is always wider than the gap inside one.

/** The wrapper of the groups: draws the hairline between them. */
export const FORM_GROUPS = "divide-y divide-border";

/** One group of fields. */
export const FORM_GROUP = "space-y-4 py-6 first:pt-0 last:pb-0";
