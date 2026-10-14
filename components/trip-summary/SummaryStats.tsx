import type { CSSProperties } from "react";
import type { Messages } from "@/lib/messages";

export type SummaryStat = { label: string; value: string };

type SummaryStatsProps = {
  stats: SummaryStat[];
  text: Messages["tripSummary"]["stats"];
};

// The trip in a few numbers, read as one row of facts under the title: the label over its value, no box around
// each. Only numbers the trip really has are passed in, so nothing reads as zero or as a guess; with none at all
// the row is left out.
export default function SummaryStats({ stats, text }: SummaryStatsProps) {
  if (stats.length === 0) return null;
  return (
    <section aria-label={text.label} className="mt-8">
      <dl className="grid grid-cols-2 gap-4 sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none">
        {stats.map((stat, index) => (
          <div key={stat.label} style={{ "--item-index": index } as CSSProperties} className="min-w-0 motion-safe:animate-list-in">
            <dt className="text-caption font-bold text-text-muted">{stat.label}</dt>
            <dd className="mt-1 font-heading text-h3 wrap-break-word text-text tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
