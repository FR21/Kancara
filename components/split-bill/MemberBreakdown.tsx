"use client";

import { ChevronDown } from "lucide-react";
import { type CSSProperties, useId, useState } from "react";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { BADGE } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import type { SplitBill } from "@/lib/split-bill/bill";
import { formatRupiah } from "@/lib/split-bill/format";
import type { MemberBalance } from "@/lib/split-bill/settle-up";
import { plural } from "@/lib/trips/format";
import { netText } from "./bill-summary-text";

type MemberBreakdownProps = {
  bill: SplitBill;
  balances: MemberBalance[];
  text: Messages["splitBill"]["results"];
  locale: string;
};

const NET_TONES = {
  receive: "bg-success-subtle text-on-success-subtle",
  pay: "bg-error-subtle text-on-error-subtle",
  even: "bg-surface-muted text-text-muted",
};

function netTone(net: number): string {
  if (net > 0) return NET_TONES.receive;
  if (net < 0) return NET_TONES.pay;
  return NET_TONES.even;
}

// Each member's share of the bill, one row each, opening to their share of every expense they took part in.
export default function MemberBreakdown({ bill, balances, text, locale }: MemberBreakdownProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const panelPrefix = useId();
  const nameOf = (id: string) => bill.members.find((member) => member.id === id)?.name ?? "";
  const money = (amount: number) => formatRupiah(amount, locale);

  return (
    <ul className="divide-y divide-border overflow-clip rounded-surface border border-border bg-surface">
      {balances.map((balance, index) => {
        const open = openId === balance.memberId;
        const panelId = `${panelPrefix}-${balance.position}`;
        return (
          <li key={balance.memberId} style={{ "--item-index": index } as CSSProperties} className="motion-safe:animate-list-in">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={open ? panelId : undefined}
              onClick={() => setOpenId(open ? null : balance.memberId)}
              className="flex min-h-16 w-full cursor-pointer items-center gap-3 px-surface py-3 text-left outline-primary transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 active:scale-[0.99]"
            >
              <MemberAvatar ageGroup="adult" variant={balance.position} className="size-10" />
              <span className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  <span className="block truncate text-label-lg text-text">{balance.name}</span>
                  <span className="block text-caption text-text-muted tabular-nums">
                    {text.share} {money(balance.share)} · {text.paid} {money(balance.paid)}
                  </span>
                </span>
                <span className="shrink-0">
                  <span className={`${BADGE} tabular-nums ${netTone(balance.net)}`}>
                    {netText(balance, text, locale)}
                  </span>
                </span>
              </span>
              <ChevronDown
                className={`size-5 shrink-0 text-text-muted transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            {open && (
              <div id={panelId} className="border-t border-border bg-background px-surface py-3 motion-safe:animate-message-in">
                {balance.lines.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {balance.lines.map((line) => (
                      <li key={line.expenseId} className="flex items-start justify-between gap-4 py-2 text-body-sm">
                        <span className="min-w-0">
                          <span className="block break-words text-text">{line.description}</span>
                          <span className="block text-caption text-text-muted">
                            {line.paidByMemberId === balance.memberId
                              ? text.lineSelf
                              : fillTemplate(text.linePaidBy, { name: nameOf(line.paidByMemberId) })}
                            {" · "}
                            {plural(text.lineSplit, line.sharedBy, locale)}
                          </span>
                        </span>
                        <span className="shrink-0 text-right tabular-nums">
                          <span className="block text-label text-text">{money(line.share)}</span>
                          <span className="block text-caption text-text-muted">{fillTemplate(text.lineOfTotal, { amount: money(line.total) })}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-2 text-body-sm text-text-muted">{text.noLines}</p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
