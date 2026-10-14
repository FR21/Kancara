export const EASE = "ease-[cubic-bezier(0.23,1,0.32,1)]";

export const INPUT =
  "h-12 w-full rounded-lg border border-border-strong bg-background px-4 text-body text-text transition-colors duration-150 placeholder:text-text-muted";

/** The button that sits on a row with an INPUT (add, send, search): its height and corners match the field's. */
export const INPUT_BUTTON =
  "inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border-strong px-4 text-label text-text transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40";

export const FIELD_LABEL = "text-label text-text";

/** outlineDanger: a destructive action that is not the main one on its screen (delete beside share). */
export type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "outlineDanger";
export type ButtonSize = "small" | "medium" | "large";

const BUTTON_BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full transition-[background-color,border-color,scale,opacity] duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  outline: "border border-border-strong text-text hover:bg-surface-muted",
  ghost: "text-text hover:bg-surface-muted",
  danger: "bg-error text-on-error",
  outlineDanger: "border border-border-strong text-error hover:border-error hover:bg-error-subtle",
};

// Height, padding, and type size travel together. Tailwind orders its utilities itself, not by their place in
// the class string, so an h-11 added after a button's h-12 loses; a smaller button must come from here.
const BUTTON_SIZES: Record<ButtonSize, string> = {
  small: "h-11 px-4 text-label",
  medium: "h-12 px-6 text-label-lg",
  large: "h-14 px-8 text-label-lg",
};

// A ghost button keeps 16px sides at every size, so its words line up with text beside it (see the -ml-4 uses).
const GHOST_SIZES: Record<ButtonSize, string> = {
  small: "h-11 px-4 text-label",
  medium: "h-12 px-4 text-label-lg",
  large: "h-14 px-4 text-label-lg",
};

export function buttonClass(variant: ButtonVariant, size: ButtonSize = "medium"): string {
  const sizing = variant === "ghost" ? GHOST_SIZES[size] : BUTTON_SIZES[size];
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${sizing}`;
}

export const PRIMARY_BUTTON = buttonClass("primary");
export const OUTLINE_BUTTON = buttonClass("outline");
export const GHOST_BUTTON = buttonClass("ghost");
export const DANGER_BUTTON = buttonClass("danger");

/**
 * plain: closing, moving one step. primary: the one action of a composer (send). primaryQuiet: a target of its own on
 * a row that is itself pressable (call, chat). danger: a control that is live and must look it (a mic recording).
 */
export type IconButtonTone = "plain" | "primary" | "primaryQuiet" | "danger";

const ICON_BUTTON_BASE =
  "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40";

const ICON_BUTTON_TONES: Record<IconButtonTone, string> = {
  plain: "text-text hover:bg-surface-muted",
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  primaryQuiet: "text-primary hover:bg-primary-subtle",
  danger: "bg-error text-on-error",
};

/** A 44px round button holding only an icon. Use it through components/ui/IconButton where you can. */
export function iconButtonClass(tone: IconButtonTone = "plain"): string {
  return `${ICON_BUTTON_BASE} ${ICON_BUTTON_TONES[tone]}`;
}

export const ICON_BUTTON = iconButtonClass("plain");

/** A link or button that reads as a link, with a 44px tap height. */
export const TEXT_LINK =
  "group inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm text-label text-primary underline-offset-4 hover:underline";

export const TEXTAREA =
  "min-h-28 w-full rounded-lg border border-border-strong bg-background px-4 py-3 text-body text-text transition-colors duration-150 placeholder:text-text-muted";

/** A status or flag tag: one shape everywhere. Pair it with a tone, e.g. "bg-success-subtle text-on-success-subtle". */
export const BADGE = "inline-flex h-7 max-w-full items-center gap-1 rounded-full px-3 text-caption font-bold";

const CHOICE_BASE =
  "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-label transition-[background-color,border-color,color,scale] duration-150 ease-out active:scale-[0.97]";

// An option with words of its own (a pace and what it means, a middle ground and what it costs), drawn as a
// compact surface: 12px in from a 20px corner, so a box inside it takes an 8px corner. Picked, it fills with the
// primary colour, the way a picked chip does.
const CHOICE_CARD =
  "surface-compact flex w-full cursor-pointer items-start gap-3 rounded-surface border p-surface text-left transition-[background-color,border-color,color,scale] duration-150 ease-out active:scale-[0.99]";

export function choiceCardClass(selected: boolean): string {
  const tone = selected
    ? "border-primary bg-primary text-on-primary"
    : "border-border-strong bg-surface text-text hover:border-primary hover:bg-primary-subtle";
  return `${CHOICE_CARD} ${tone}`;
}

export function choiceClass(selected: boolean): string {
  const tone = selected
    ? "border-primary bg-primary text-on-primary"
    : "border-border-strong text-text hover:bg-surface-muted";
  return `${CHOICE_BASE} ${tone}`;
}
