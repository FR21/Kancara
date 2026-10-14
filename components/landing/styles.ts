/**
 * The shape every call to action on the public pages shares: buttonClass's large pill, in tones buttonClass does
 * not carry (gold on the sky, white on the dark reveal). Add its colours.
 */
export const CTA_SHAPE =
  "group relative inline-flex h-14 cursor-pointer items-center justify-center gap-2 rounded-full px-8 text-label-lg transition-[background-color,border-color,color,scale] duration-150 ease-out active:scale-[0.97]";

/** The gold "start planning" button of the public pages, the brightest thing on the screen it sits on. */
export const ACCENT_CTA = `${CTA_SHAPE} overflow-hidden bg-accent-300 text-neutral-950 shadow-xl shadow-neutral-950/10 hover:bg-accent-200`;

/** The quieter second choice beside ACCENT_CTA: words that underline on hover. Add its text colour. */
export const QUIET_CTA =
  "group inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-label-lg underline-offset-8 transition-[scale] duration-150 ease-out hover:underline active:scale-[0.97]";
