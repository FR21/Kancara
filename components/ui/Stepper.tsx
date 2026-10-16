import { Check } from "lucide-react";
import { fillTemplate } from "@/lib/plan-draft";

export type StepperStep = {
  key: string;
  label: string;
  done: boolean;
  current: boolean;
  /** Null while the step cannot be opened yet. */
  onSelect: (() => void) | null;
};

/** The words every stepper needs; each feature keeps its own copy of them in its message file. */
export type StepperText = {
  label: string;
  done: string;
  locked: string;
  /** "Step {current} of {total}". */
  stepOf: string;
  /** "Next: {name}". */
  next: string;
};

type StepperProps = {
  steps: StepperStep[];
  text: StepperText;
};

const STATION =
  "relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full outline-offset-2 transition-[scale] duration-150 ease-out";

function labelTone(step: StepperStep): string {
  if (step.current) return "text-primary";
  if (step.done) return "text-text";
  return "text-text-muted";
}

/** The dot a station is drawn as: filled once passed, ringed where the visitor is, hollow ahead. */
function Dot({ step, last }: { step: StepperStep; last: boolean }) {
  if (step.done) {
    return (
      <span
        aria-hidden="true"
        className={`flex items-center justify-center rounded-full bg-primary text-on-primary motion-safe:animate-pop-in ${last ? "h-5 w-7" : "size-5"}`}
      >
        <Check className="size-3" strokeWidth={4} />
      </span>
    );
  }
  const shape = last ? "h-4 w-6 rounded-full" : "size-4 rounded-full";
  if (step.current) return <span aria-hidden="true" className={`${shape} border-4 border-primary bg-background ring-4 ring-primary/20`} />;
  return <span aria-hidden="true" className={`${shape} border-2 border-border-strong bg-background`} />;
}

// Every multi-step task in Kancara is a line to ride, one station per step, the last one wider like the end of
// the line. Stations passed are filled and can be opened again; the one the visitor is at is ringed; the ones
// ahead wait, hollow, until the steps before them are done. From 1024px every station is named under the line;
// on a narrower screen the line keeps its stations and names only where the visitor is and where they go next.
export default function Stepper({ steps, text }: StepperProps) {
  const currentIndex = steps.findIndex((step) => step.current);
  const current = steps[currentIndex];
  const next = steps[currentIndex + 1];
  // How far along the ride is, for the stretch of line drawn in full colour.
  const reached = steps.reduce((furthest, step, index) => (step.done || step.current ? index : furthest), 0);
  const progress = steps.length > 1 ? reached / (steps.length - 1) : 0;

  return (
    <nav aria-label={text.label}>
      <div className="relative [--station:2.75rem]">
        {/* The track runs between the first and the last station's centres. */}
        <span aria-hidden="true" className="absolute inset-x-[calc(var(--station)/2)] top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary/15" />
        <span
          aria-hidden="true"
          className="absolute inset-x-[calc(var(--station)/2)] top-1/2 h-1 origin-left -translate-y-1/2 rounded-full bg-primary transition-[scale] duration-500 ease-out motion-reduce:transition-none"
          style={{ scale: `${progress} 1` }}
        />
        <ol className="relative flex items-center justify-between">
          {steps.map((step, index) => {
            const last = index === steps.length - 1;
            const name = (
              <span className="sr-only">
                {step.label}
                {step.done ? `, ${text.done}` : ""}
                {!step.current && !step.onSelect ? `, ${text.locked}` : ""}
              </span>
            );
            return (
              <li key={step.key} className="flex flex-col items-center">
                {step.current && (
                  <span aria-current="step" className={STATION}>
                    <Dot step={step} last={last} />
                    {name}
                  </span>
                )}
                {!step.current && step.onSelect && (
                  <button type="button" onClick={step.onSelect} className={`${STATION} cursor-pointer hover:scale-110 active:scale-95`}>
                    <Dot step={step} last={last} />
                    {name}
                  </button>
                )}
                {!step.current && !step.onSelect && (
                  <span className={STATION}>
                    <Dot step={step} last={last} />
                    {name}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Station names under the line where there is room for all of them. */}
      <ol aria-hidden="true" className="mt-1 hidden justify-between lg:flex">
        {steps.map((step) => (
          <li
            key={step.key}
            className={`flex w-11 justify-center text-caption font-bold whitespace-nowrap transition-colors duration-300 first:justify-start last:justify-end ${labelTone(step)}`}
          >
            {step.label}
          </li>
        ))}
      </ol>

      {current && (
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-label text-text lg:hidden">
          <span className="text-primary tabular-nums">{fillTemplate(text.stepOf, { current: currentIndex + 1, total: steps.length })}</span>
          {current.label}
          {next && <span className="text-caption font-medium text-text-muted">· {fillTemplate(text.next, { name: next.label })}</span>}
        </p>
      )}
    </nav>
  );
}
