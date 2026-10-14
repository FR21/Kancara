import { ArrowRight, Check, CircleCheck, Copy, RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import IconButton from "@/components/ui/IconButton";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { buttonClass, choiceClass } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { type SettledTransfer, type SplitBill, transferKey } from "@/lib/split-bill/bill";
import { formatRupiah } from "@/lib/split-bill/format";

type TransferListProps = {
  bill: SplitBill;
  transfers: SettledTransfer[];
  text: Messages["splitBill"]["results"];
  locale: string;
  onToggle: (transfer: SettledTransfer, paid: boolean) => void;
  onToggleAll: (paid: boolean) => void;
  onCopyReminder: (transfer: SettledTransfer) => void;
};

function Person({ name, variant }: { name: string; variant: number }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-label-lg text-text">
      <MemberAvatar ageGroup="adult" variant={variant} className="size-8" />
      <span className="truncate">{name}</span>
    </span>
  );
}

// The suggested transfers, each one marked paid once the money has arrived, with how far the group is overall.
export default function TransferList({ bill, transfers, text, locale, onToggle, onToggleAll, onCopyReminder }: TransferListProps) {
  if (transfers.length === 0) {
    return (
      <div className="rounded-surface bg-success-subtle p-surface motion-safe:animate-message-in">
        <div className="flex flex-col items-center py-4 text-center">
          <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-success text-on-success">
            <CircleCheck className="size-6" />
          </span>
          <p className="mt-4 text-h3 text-balance text-on-success-subtle">{text.allEven}</p>
          <p className="mt-2 max-w-md text-body-sm text-pretty text-on-success-subtle">{text.allEvenBody}</p>
        </div>
      </div>
    );
  }

  const settledKeys = new Set(bill.settled.map(transferKey));
  const isPaid = (transfer: SettledTransfer) => settledKeys.has(transferKey(transfer));
  const paidTransfers = transfers.filter(isPaid);
  const totalAmount = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
  const paidAmount = paidTransfers.reduce((sum, transfer) => sum + transfer.amount, 0);
  const allPaid = paidTransfers.length === transfers.length;
  const percentage = Math.round((paidTransfers.length / transfers.length) * 100);
  const indexOf = new Map(bill.members.map((member, index) => [member.id, index]));
  const nameOf = (id: string) => bill.members.find((member) => member.id === id)?.name ?? "";
  const money = (amount: number) => formatRupiah(amount, locale);

  return (
    <div className="overflow-clip rounded-surface border border-border bg-surface">
      <div className="space-y-3 border-b border-border px-surface py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-label-lg text-text tabular-nums">
              {fillTemplate(text.progress, { paid: paidTransfers.length, total: transfers.length })}
            </p>
            <p className="text-caption text-text-muted tabular-nums">
              {fillTemplate(text.progressAmount, { paid: money(paidAmount), total: money(totalAmount) })}
            </p>
          </div>
          <button type="button" onClick={() => onToggleAll(!allPaid)} className={buttonClass("outline", "small")}>
            {allPaid ? <RotateCcw className="size-4" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
            {allPaid ? text.unmarkAll : text.markAll}
          </button>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
          aria-label={fillTemplate(text.progress, { paid: paidTransfers.length, total: transfers.length })}
          className="h-2 overflow-clip rounded-full bg-border"
        >
          <span
            className="block h-full origin-left bg-success transition-[scale] duration-500 ease-out motion-reduce:transition-none"
            style={{ scale: `${percentage / 100} 1` }}
          />
        </div>
      </div>

      <ul className="divide-y divide-border">
        {transfers.map((transfer, index) => {
          const paid = isPaid(transfer);
          const debtor = nameOf(transfer.fromMemberId);
          return (
            <li
              key={transferKey(transfer)}
              style={{ "--item-index": index } as CSSProperties}
              className={`space-y-2 px-surface py-4 transition-colors duration-150 ease-out motion-safe:animate-list-in ${paid ? "bg-success-subtle" : ""}`}
            >
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Person name={debtor} variant={indexOf.get(transfer.fromMemberId) ?? 0} />
                <span className="inline-flex items-center gap-1 text-caption text-text-muted">
                  {text.paysTo}
                  <ArrowRight className="size-4 text-primary" aria-hidden="true" />
                </span>
                <Person name={nameOf(transfer.toMemberId)} variant={indexOf.get(transfer.toMemberId) ?? 0} />
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className={`font-heading text-h3 tabular-nums ${paid ? "text-on-success-subtle" : "text-text"}`}>{money(transfer.amount)}</p>
                <div className="flex items-center gap-2">
                  <button type="button" aria-pressed={paid} onClick={() => onToggle(transfer, !paid)} className={choiceClass(paid)}>
                    {paid ? (
                      <CircleCheck className="size-4 motion-safe:animate-pop-in" aria-hidden="true" />
                    ) : (
                      <Check className="size-4" aria-hidden="true" />
                    )}
                    {paid ? text.isPaid : text.markPaid}
                  </button>
                  <IconButton label={fillTemplate(text.copyReminder, { name: debtor })} onClick={() => onCopyReminder(transfer)}>
                    <Copy className="size-4" aria-hidden="true" />
                  </IconButton>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
