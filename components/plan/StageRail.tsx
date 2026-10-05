import { Check } from "lucide-react";
import type { Messages } from "@/lib/messages";
import { type Stage, STAGES } from "./flow";

type StageRailProps = {
  stage: Stage;
  text: Messages["plan"]["stages"];
  reachable: Record<Stage, boolean>;
  onNavigate: (stage: Stage) => void;
};

const STEP =
  "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full px-2 text-label whitespace-nowrap";

export default function StageRail({ stage, text, reachable, onNavigate }: StageRailProps) {
  const currentIndex = STAGES.indexOf(stage);

  return (
    <nav aria-label={text.label}>
      <ol className="flex items-center gap-1">
        {STAGES.map((key, index) => {
          const active = key === stage;
          const done = index < currentIndex;
          const isLast = index === STAGES.length - 1;
          const locked = !active && !reachable[key];
          const content = (
            <>
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-caption font-bold tabular-nums transition-[background-color,border-color,color] duration-300 ${
                  done ? "border-primary bg-primary text-on-primary" : "border-current"
                }`}
              >
                {done ? <Check className="size-3.5" strokeWidth={3.5} aria-hidden="true" /> : index + 1}
              </span>
              <span className={active ? "" : "sr-only sm:not-sr-only"}>{text[key]}</span>
              {done && <span className="sr-only">{text.done}</span>}
              {locked && <span className="sr-only">{text.locked}</span>}
            </>
          );
          return (
            <li key={key} className={`flex items-center gap-1 ${isLast ? "" : "flex-1"}`}>
              {active && (
                <span aria-current="step" className={`${STEP} text-primary`}>
                  {content}
                </span>
              )}
              {locked && <span className={`${STEP} text-text-muted`}>{content}</span>}
              {!active && !locked && (
                <button
                  type="button"
                  onClick={() => onNavigate(key)}
                  className={`${STEP} cursor-pointer text-text-muted transition-[background-color,color] duration-150 ease-out hover:bg-surface-muted hover:text-text`}
                >
                  {content}
                </button>
              )}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`h-px min-w-2 flex-1 transition-colors duration-300 ${done ? "bg-primary" : "bg-border"}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
