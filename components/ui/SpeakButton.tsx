import { Volume2 } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";

type SpeakButtonProps = {
  label: string;
  /** Shown while this text is being read aloud. */
  speakingLabel: string;
  speaking: boolean;
  onSpeak: () => void;
  /** "inverse" sits on a primary fill, such as the traveler's own chat bubble. */
  variant?: "primary" | "outline" | "inverse";
  className?: string;
};

const INVERSE =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-on-primary/40 px-4 text-label text-on-primary transition-[background-color,scale] duration-150 ease-out hover:bg-on-primary/15 active:scale-[0.97]";

// The button that reads a piece of text aloud (see lib/use-speech). Its words change while it reads, so the
// state never rests on the moving icon alone.
export default function SpeakButton({ label, speakingLabel, speaking, onSpeak, variant = "outline", className = "" }: SpeakButtonProps) {
  return (
    <button type="button" onClick={onSpeak} className={`${variant === "inverse" ? INVERSE : buttonClass(variant, "small")} ${className}`}>
      <Volume2 className={`size-4 ${speaking ? "motion-safe:animate-pulse" : ""}`} aria-hidden="true" />
      <span aria-live="polite">{speaking ? speakingLabel : label}</span>
    </button>
  );
}
