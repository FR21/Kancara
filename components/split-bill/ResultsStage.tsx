import { type Ref, useId } from "react";
import DeckFooter from "@/components/plan/DeckFooter";
import Disclosure from "@/components/ui/Disclosure";
import type { Messages } from "@/lib/messages";
import type { SettledTransfer, SplitBill } from "@/lib/split-bill/bill";
import type { BillSummary } from "@/lib/split-bill/settle-up";
import BillOverview from "./BillOverview";
import MemberBreakdown from "./MemberBreakdown";
import TransferList from "./TransferList";

type ResultsStageProps = {
  bill: SplitBill;
  summary: BillSummary;
  text: Messages["splitBill"];
  locale: string;
  headingRef: Ref<HTMLHeadingElement>;
  downloading: boolean;
  onDownload: () => void;
  onCopySummary: () => void;
  onToggleSettled: (transfers: SettledTransfer[], paid: boolean) => void;
  onCopyReminder: (transfer: SettledTransfer) => void;
  onBack: () => void;
};

export default function ResultsStage({
  bill,
  summary,
  text,
  locale,
  headingRef,
  downloading,
  onDownload,
  onCopySummary,
  onToggleSettled,
  onCopyReminder,
  onBack,
}: ResultsStageProps) {
  const results = text.results;
  const headingId = useId();
  const breakdownId = useId();
  const transfersId = useId();

  return (
    <section aria-labelledby={headingId} className="motion-safe:animate-message-in">
      {/* The same shape as the steps before it: the card with the step's heading first, its lists beside it from
          1024px. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <BillOverview
          bill={bill}
          summary={summary}
          text={text}
          locale={locale}
          headingId={headingId}
          headingRef={headingRef}
          downloading={downloading}
          onDownload={onDownload}
          onCopy={onCopySummary}
        />

        <div className="space-y-8">
          <section aria-labelledby={transfersId}>
            <h3 id={transfersId} className="text-h3 text-text">
              {results.transfersHeading}
            </h3>
            <p className="mt-1 text-body-sm text-pretty text-text-muted">{results.transfersSubtitle}</p>
            <div className="mt-4">
              <TransferList
                bill={bill}
                transfers={summary.transfers}
                text={results}
                locale={locale}
                onToggle={(transfer, paid) => onToggleSettled([transfer], paid)}
                onToggleAll={(paid) => onToggleSettled(summary.transfers, paid)}
                onCopyReminder={onCopyReminder}
              />
            </div>
          </section>

          <section aria-labelledby={breakdownId}>
            <h3 id={breakdownId} className="text-h3 text-text">
              {results.breakdownHeading}
            </h3>
            <p className="mt-1 text-body-sm text-pretty text-text-muted">{results.breakdownSubtitle}</p>
            {/* Who pays whom is the answer; how each share was reached is there for whoever asks. */}
            <div className="mt-2">
              <Disclosure showLabel={results.showBreakdown} hideLabel={results.hideBreakdown}>
                <MemberBreakdown bill={bill} balances={summary.balances} text={results} locale={locale} />
              </Disclosure>
            </div>
          </section>
        </div>
      </div>

      <div className="mt-8">
        <DeckFooter backLabel={results.back} onBack={onBack} note={null}>
          {null}
        </DeckFooter>
      </div>
    </section>
  );
}
