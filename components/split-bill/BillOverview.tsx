import { Copy, Download, Loader2 } from "lucide-react";
import type { CSSProperties, Ref } from "react";
import { buttonClass } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import type { SplitBill } from "@/lib/split-bill/bill";
import { formatRupiah } from "@/lib/split-bill/format";
import type { BillSummary } from "@/lib/split-bill/settle-up";
import { plural } from "@/lib/trips/format";
import { CATEGORY_ICONS } from "./category-icons";

type BillOverviewProps = {
  bill: SplitBill;
  summary: BillSummary;
  text: Messages["splitBill"];
  locale: string;
  headingId: string;
  headingRef: Ref<HTMLHeadingElement>;
  downloading: boolean;
  onDownload: () => void;
  onCopy: () => void;
};

const LABEL = "text-label text-text-muted";
const AMOUNT = "mt-1 font-heading text-h1 wrap-break-word tabular-nums";

// The bill on one plain card, read top to bottom: what it came to, where the money went, and the ways to share
// it. Who pays whom stands beside it, so the card does not repeat the settling up.
export default function BillOverview({ bill, summary, text, locale, headingId, headingRef, downloading, onDownload, onCopy }: BillOverviewProps) {
  const results = text.results;
  const money = (amount: number) => formatRupiah(amount, locale);

  return (
    <div className="rounded-surface border border-border bg-surface p-surface">
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-h2 text-balance text-text outline-none">
        {results.heading}
      </h2>
      <p className="mt-2 text-body text-pretty text-text-muted">{results.subtitle}</p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div>
          <dt className={LABEL}>{results.total}</dt>
          <dd className={`${AMOUNT} text-text`}>{money(summary.total)}</dd>
          <dd className="mt-1 text-caption text-text-muted">{plural(text.expenses.count, bill.expenses.length, locale)}</dd>
        </div>
        <div>
          <dt className={LABEL}>{results.perPerson}</dt>
          <dd className={`${AMOUNT} text-primary`}>{money(summary.perPerson)}</dd>
          <dd className="mt-1 text-caption text-text-muted">{plural(text.members.count, bill.members.length, locale)}</dd>
        </div>
      </dl>

      {summary.categories.length > 0 && (
        <section aria-labelledby={`${headingId}-categories`} className="mt-6">
          <h3 id={`${headingId}-categories`} className={LABEL}>
            {results.categories}
          </h3>
          <ul className="mt-2 space-y-3">
            {summary.categories.map((entry, index) => {
              const Icon = CATEGORY_ICONS[entry.category];
              return (
                <li key={entry.category} style={{ "--item-index": index } as CSSProperties} className="motion-safe:animate-list-in">
                  <div className="flex items-center gap-2 text-body-sm">
                    <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-text">{text.categories[entry.category]}</span>
                    <span className="text-text tabular-nums">{money(entry.amount)}</span>
                    <span className="w-12 text-right text-text-muted tabular-nums">{entry.percentage}%</span>
                  </div>
                  <span aria-hidden="true" className="mt-1 block h-1 overflow-clip rounded-full bg-primary/15">
                    <span
                      className="block h-full origin-left bg-primary transition-[scale] duration-500 ease-out motion-reduce:transition-none"
                      style={{ scale: `${entry.percentage / 100} 1` }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-6 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-1">
        <button type="button" onClick={onDownload} disabled={downloading} className={buttonClass("primary")}>
          {downloading ? (
            <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-4" aria-hidden="true" />
          )}
          {downloading ? results.downloading : results.download}
        </button>
        <button type="button" onClick={onCopy} className={buttonClass("outline")}>
          <Copy className="size-4" aria-hidden="true" />
          {results.copySummary}
        </button>
      </div>
    </div>
  );
}
