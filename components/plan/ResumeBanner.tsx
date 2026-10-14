import { ArrowRight, RotateCcw, X } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import type { Messages } from "@/lib/messages";
import { type PlanDraft, fillTemplate, missingFields, PASS_FIELDS } from "@/lib/plan-draft";

type ResumeBannerProps = {
  savedDraft: PlanDraft;
  text: Messages["plan"]["chat"];
  onResume: () => void;
  onClear?: () => void;
};

// A quiet second way in under the start button: pick up the draft saved on this device. One pill holding two
// controls, so its own buttons are pills too, 4px in.
export default function ResumeBanner({ savedDraft, text, onResume, onClear }: ResumeBannerProps) {
  const title =
    savedDraft.destinations.length > 0
      ? fillTemplate(text.resumeTitle, { destination: savedDraft.destinations.join(", ") })
      : text.resume;

  return (
    <div className="inline-flex max-w-full items-center gap-1 rounded-full border border-border-strong bg-surface p-1 transition-[border-color] duration-150 ease-out hover:border-primary">
      <button
        type="button"
        onClick={onResume}
        className="group inline-flex min-h-11 max-w-full min-w-0 cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-left text-label text-text transition-[background-color,scale] duration-150 ease-out hover:bg-primary-subtle active:scale-[0.97]"
      >
        <RotateCcw
          className="size-4 shrink-0 text-primary transition-[rotate] duration-500 ease-out group-hover:-rotate-180"
          aria-hidden="true"
        />
        <span className="min-w-0 truncate">{title}</span>
        <span className="sr-only shrink-0 text-body-sm text-text-muted tabular-nums sm:not-sr-only">
          ·{" "}
          {fillTemplate(text.resumeProgress, {
            done: PASS_FIELDS.length - missingFields(savedDraft).length,
            total: PASS_FIELDS.length,
          })}
        </span>
        <ArrowRight
          className="size-4 shrink-0 text-text-muted transition-[translate] duration-200 ease-out group-hover:translate-x-1"
          aria-hidden="true"
        />
      </button>

      {onClear && (
        <IconButton label={text.clearDraft} onClick={onClear}>
          <X className="size-4" aria-hidden="true" />
        </IconButton>
      )}
    </div>
  );
}
