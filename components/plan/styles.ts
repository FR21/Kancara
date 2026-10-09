export const EASE = "ease-[cubic-bezier(0.23,1,0.32,1)]";

export const INPUT =
  "h-12 w-full rounded-lg border border-border-strong bg-background px-4 text-body text-text transition-colors duration-150 placeholder:text-text-muted";

export const FIELD_LABEL = "text-label text-text";

export const PRIMARY_BUTTON =
  "inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 text-label-lg text-on-primary transition-[background-color,scale,opacity] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40";

export const OUTLINE_BUTTON =
  "inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-border-strong px-6 text-label-lg text-text transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40";

export const GHOST_BUTTON =
  "inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-label-lg text-text transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.97]";

const CHOICE_BASE =
  "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-label transition-[background-color,border-color,color,scale] duration-150 ease-out active:scale-[0.97]";

export function choiceClass(selected: boolean): string {
  const tone = selected
    ? "border-primary bg-primary text-on-primary"
    : "border-border-strong text-text hover:bg-surface-muted";
  return `${CHOICE_BASE} ${tone}`;
}
