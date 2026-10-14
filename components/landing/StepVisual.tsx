import type { ReactElement } from "react";
import { Check, CloudSun, MessagesSquare, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import Stamp from "@/components/ui/Stamp";
import { BADGE, EASE } from "@/components/ui/styles";

export type StepVisualKind = "match" | "checklist" | "live";

type StepItem = { label: string; value: string };

type StepVisualProps = {
  kind: StepVisualKind;
  title: string;
  items: StepItem[];
  result: string;
  liveLabel: string;
};

type RowProps = { item: StepItem; delay: number };

const ICONS: Record<StepVisualKind, LucideIcon> = {
  match: MessagesSquare,
  checklist: ShieldCheck,
  live: CloudSun,
};

const SETTLE = `duration-300 ${EASE}`;

const ROW_INTRO = `transition-[opacity,translate] duration-500 ${EASE} motion-safe:translate-y-2 motion-safe:opacity-0 motion-safe:group-data-visible/reveal:translate-y-0 motion-safe:group-data-visible/reveal:opacity-100`;

const PULSE =
  "absolute inset-0 animate-ping rounded-full [animation-play-state:paused] group-data-in-view/timeline:[animation-play-state:running] motion-reduce:hidden";

function MatchRow({ item, delay }: RowProps) {
  return (
    <li style={{ transitionDelay: `${delay}ms` }} className={ROW_INTRO}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body-sm font-bold text-text">{item.label}</span>
        <span className="font-heading text-h3 font-extrabold text-primary tabular-nums">{item.value}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          style={{ width: item.value, transitionDelay: `${delay + 150}ms` }}
          className={`h-full origin-left rounded-full bg-primary transition-[scale] duration-1000 ${EASE} motion-safe:scale-x-0 motion-safe:group-data-visible/reveal:scale-x-100`}
        />
      </div>
    </li>
  );
}

function ChecklistRow({ item, delay }: RowProps) {
  return (
    <li
      style={{ transitionDelay: `${delay}ms` }}
      className={`flex items-center gap-3 py-3 text-body-sm font-bold text-text first:pt-0 last:pb-0 ${ROW_INTRO}`}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success-subtle text-on-success-subtle">
        <Check className="size-4" strokeWidth={3} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">{item.label}</span>
      <span className="shrink-0 font-heading text-label-lg font-extrabold text-text tabular-nums">{item.value}</span>
    </li>
  );
}

// The status is printed in amber on black, the way a departure board shows it.
function LiveRow({ item, delay }: RowProps) {
  return (
    <li
      style={{ transitionDelay: `${delay}ms` }}
      className={`flex items-center gap-3 py-3 text-body-sm font-bold text-text first:pt-0 last:pb-0 ${ROW_INTRO}`}
    >
      <span className="relative flex size-2 shrink-0">
        <span className={`${PULSE} bg-success`} />
        <span className="relative size-2 rounded-full bg-success" />
      </span>
      <span className="min-w-0 flex-1">{item.label}</span>
      <span className={`${BADGE} shrink-0 bg-neutral-950 tracking-wider text-accent-300 uppercase`}>
        {item.value}
      </span>
    </li>
  );
}

const ROWS: Record<StepVisualKind, (props: RowProps) => ReactElement> = {
  match: MatchRow,
  checklist: ChecklistRow,
  live: LiveRow,
};

// Each step is shown as one plain card: a teal band naming it, the rows, and the outcome under a hairline. A second
// card peeks out behind it, and both straighten when the pointer is over them.
export default function StepVisual({ kind, title, items, result, liveLabel }: StepVisualProps) {
  const Icon = ICONS[kind];
  const Row = ROWS[kind];
  const listClass = kind === "match" ? "space-y-4" : "divide-y divide-border";

  return (
    <div className="group/pass relative mx-auto w-full max-w-lg px-2 py-4 sm:px-4 sm:py-6">
      <span
        aria-hidden="true"
        className={`absolute inset-x-2 inset-y-4 rotate-3 rounded-surface bg-primary-200 transition-[rotate] group-hover/pass:rotate-1 sm:inset-x-4 sm:inset-y-6 dark:bg-primary-900 ${SETTLE}`}
      />

      <div
        className={`relative -rotate-2 overflow-clip rounded-surface border border-border bg-surface shadow-lg shadow-neutral-950/10 transition-[rotate,translate] group-hover/pass:-translate-y-1 group-hover/pass:rotate-0 ${SETTLE}`}
      >
        <div className="flex min-h-14 items-center gap-3 bg-primary px-surface py-3 text-on-primary">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-on-primary/15">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <p className="min-w-0 flex-1 text-label">{title}</p>
          {kind === "live" && (
            <span className="flex shrink-0 items-center gap-2 text-caption font-bold">
              <span className="relative flex size-2">
                <span className={`${PULSE} bg-accent-300`} />
                <span className="relative size-2 rounded-full bg-accent-300" />
              </span>
              {liveLabel}
            </span>
          )}
        </div>

        <ul className={`p-surface ${listClass}`}>
          {items.map((item, index) => (
            <Row key={item.label} item={item} delay={200 + index * 100} />
          ))}
        </ul>

        <div className="border-t border-border p-surface">
          {kind === "checklist" ? (
            <Stamp
              label={result}
              className="motion-safe:group-data-visible/reveal:animate-stamp-in motion-safe:group-data-visible/reveal:[animation-delay:700ms]"
            />
          ) : (
            // Drawn like a BADGE, but free to wrap onto a second line: the outcome is a whole sentence in Indonesian.
            <p className="inline-flex min-h-7 items-center gap-1 rounded-full bg-accent-300 px-3 py-1 text-caption font-bold text-neutral-950">
              <Sparkles className="size-4 shrink-0" aria-hidden="true" />
              {result}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
