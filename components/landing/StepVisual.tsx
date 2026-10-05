import type { ReactElement } from "react";
import { Check, CloudSun, MessagesSquare, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";

export type StepVisualKind = "match" | "checklist" | "live";

type StepItem = { label: string; val: string };

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


const ROW_INTRO =
  "transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:translate-y-2 motion-safe:opacity-0 motion-safe:group-data-visible/reveal:translate-y-0 motion-safe:group-data-visible/reveal:opacity-100";

const PULSE =
  "absolute inset-0 animate-ping rounded-full [animation-play-state:paused] group-data-in-view/timeline:[animation-play-state:running] motion-reduce:hidden";

function MatchRow({ item, delay }: RowProps) {
  return (
    <li style={{ transitionDelay: `${delay}ms` }} className={ROW_INTRO}>
      <div className="mb-1 flex justify-between gap-3 text-body-sm font-bold text-text">
        <span>{item.label}</span>
        <span className="text-primary tabular-nums">{item.val}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-primary-100 dark:bg-primary-900">
        <div
          style={{ width: item.val, transitionDelay: `${delay + 150}ms` }}
          className="h-full origin-left rounded-full bg-primary transition-[scale] duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:scale-x-0 motion-safe:group-data-visible/reveal:scale-x-100"
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
        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
      </span>
      <span className="flex-1">{item.label}</span>
      <span className="shrink-0 text-text-muted tabular-nums">{item.val}</span>
    </li>
  );
}

function LiveRow({ item, delay }: RowProps) {
  return (
    <li
      style={{ transitionDelay: `${delay}ms` }}
      className={`flex items-center gap-3 text-body-sm font-bold text-text ${ROW_INTRO}`}
    >
      <span className="relative flex size-2 shrink-0">
        <span className={`${PULSE} bg-success`} />
        <span className="relative size-2 rounded-full bg-success" />
      </span>
      <span className="flex-1">{item.label}</span>
      <span className="shrink-0 rounded-full bg-success-subtle px-2.5 py-1 text-caption font-bold text-on-success-subtle">
        {item.val}
      </span>
    </li>
  );
}

const ROWS: Record<StepVisualKind, (props: RowProps) => ReactElement> = {
  match: MatchRow,
  checklist: ChecklistRow,
  live: LiveRow,
};

export default function StepVisual({ kind, title, items, result, liveLabel }: StepVisualProps) {
  const Icon = ICONS[kind];
  const Row = ROWS[kind];
  const listClass = kind === "checklist" ? "divide-y divide-border" : "space-y-4";

  return (
    <div className="rounded-3xl bg-primary-100 p-4 transition-colors duration-300 hover:bg-primary-200 sm:p-10 dark:bg-primary-950 dark:hover:bg-primary-900">
      <div className="-rotate-2 rounded-2xl border border-border bg-white p-4 shadow-md transition-[rotate,scale] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-[1.02] hover:rotate-0 sm:p-6 dark:bg-neutral-900">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <p className="flex-1 text-label text-text">{title}</p>
          {kind === "live" && (
            <span className="flex shrink-0 items-center gap-1.5 text-caption font-bold text-text-muted">
              <span className="relative flex size-2">
                <span className={`${PULSE} bg-error`} />
                <span className="relative size-2 rounded-full bg-error" />
              </span>
              {liveLabel}
            </span>
          )}
        </div>

        <ul className={`mt-4 ${listClass}`}>
          {items.map((item, index) => (
            <Row key={item.label} item={item} delay={200 + index * 100} />
          ))}
        </ul>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-3.5 py-1.5 text-caption font-bold text-accent-900 dark:bg-accent-950 dark:text-accent-200">
          <Sparkles className="size-3.5 text-accent-700 dark:text-accent-300" aria-hidden="true" />
          <span>{result}</span>
        </div>
      </div>
    </div>
  );
}
