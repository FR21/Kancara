import { Check } from "lucide-react";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";

export type RailStep = {
  key: string;
  label: string;
  done: boolean;
  current: boolean;
  /** Null while the step cannot be opened yet. */
  onSelect: (() => void) | null;
};

type StageRailProps = {
  steps: RailStep[];
  text: Messages["plan"]["stages"];
};

const STEP =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-1 text-label whitespace-nowrap";

function segmentClass(step: RailStep): string {
  if (step.current) return "bg-primary";
  return step.done ? "bg-primary/50" : "bg-border-strong/40";
}

// Every step of the plan, so the count on screen is the count the visitor will
// actually go through. From 1024px each step is named and can be opened; below
// that there is no room for eight names, so the rail becomes one segment per
// step with the current and the next step spelled out.
export default function StageRail({ steps, text }: StageRailProps) {
  const currentIndex = steps.findIndex((step) => step.current);
  const current = steps[currentIndex];
  const next = steps[currentIndex + 1];

  return (
    <nav aria-label={text.label}>
      <ol className="hidden items-center gap-1 lg:flex">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const content = (
            <>
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-caption font-bold tabular-nums transition-[background-color,border-color,color] duration-300 ${
                  step.done ? "border-primary bg-primary text-on-primary" : "border-current"
                }`}
              >
                {step.done ? <Check className="size-4" strokeWidth={3.5} aria-hidden="true" /> : index + 1}
              </span>
              {step.label}
              {step.done && <span className="sr-only">{text.done}</span>}
              {!step.current && !step.onSelect && <span className="sr-only">{text.locked}</span>}
            </>
          );
          return (
            <li key={step.key} className={`flex items-center gap-1 ${isLast ? "" : "flex-1"}`}>
              {step.current && (
                <span aria-current="step" className={`${STEP} text-primary`}>
                  {content}
                </span>
              )}
              {!step.current && step.onSelect === null && <span className={`${STEP} text-text-muted`}>{content}</span>}
              {!step.current && step.onSelect !== null && (
                <button
                  type="button"
                  onClick={step.onSelect}
                  className={`${STEP} cursor-pointer text-text-muted transition-[background-color,color] duration-150 ease-out hover:bg-surface-muted hover:text-text`}
                >
                  {content}
                </button>
              )}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`h-px min-w-2 flex-1 transition-colors duration-300 ${step.done ? "bg-primary" : "bg-border"}`}
                />
              )}
            </li>
          );
        })}
      </ol>

      {current && (
        <div className="lg:hidden">
          <div aria-hidden="true" className="flex gap-1">
            {steps.map((step) => (
              <span
                key={step.key}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${segmentClass(step)}`}
              />
            ))}
          </div>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-label text-text">
            <span className="text-primary tabular-nums">
              {fillTemplate(text.stepOf, { current: currentIndex + 1, total: steps.length })}
            </span>
            {current.label}
          </p>
          {next && (
            <p className="mt-1 text-caption text-text-muted">{fillTemplate(text.next, { name: next.label })}</p>
          )}
        </div>
      )}
    </nav>
  );
}
