import { ArrowRight, RotateCcw } from "lucide-react";
import type { Messages } from "@/lib/messages";
import { type PlanDraft, fillTemplate, missingFields, PASS_FIELDS } from "@/lib/plan-draft";

type ResumeBannerProps = {
  savedDraft: PlanDraft;
  text: Messages["plan"]["chat"];
  onResume: () => void;
};

export default function ResumeBanner({ savedDraft, text, onResume }: ResumeBannerProps) {
  const title =
    savedDraft.destinations.length > 0
      ? fillTemplate(text.resumeTitle, { destination: savedDraft.destinations.join(", ") })
      : text.resume;

  return (
    <button
      type="button"
      onClick={onResume}
      className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left transition-[background-color,border-color,scale] duration-150 ease-out hover:border-border-strong hover:bg-surface-muted active:scale-[0.99] motion-safe:animate-message-in"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
        <RotateCcw className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label text-text">{title}</span>
        <span className="block text-caption text-text-muted">
          {fillTemplate(text.resumeProgress, {
            done: PASS_FIELDS.length - missingFields(savedDraft).length,
            total: PASS_FIELDS.length,
          })}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
    </button>
  );
}
