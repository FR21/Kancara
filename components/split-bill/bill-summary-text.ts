import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { type SplitBill, transferKey } from "@/lib/split-bill/bill";
import { formatRupiah } from "@/lib/split-bill/format";
import type { BillSummary, MemberBalance } from "@/lib/split-bill/settle-up";

/** A member's net position in words: what they get back, what they still owe, or that they are even. */
export function netText(balance: MemberBalance, text: Messages["splitBill"]["results"], locale: string): string {
  const amount = formatRupiah(Math.abs(balance.net), locale);
  if (balance.net > 0) return fillTemplate(text.netReceive, { amount });
  if (balance.net < 0) return fillTemplate(text.netPay, { amount });
  return text.netEven;
}

/** The bill as plain text, to paste into a group chat. */
export function billSummaryText(bill: SplitBill, summary: BillSummary, date: string, text: Messages["splitBill"], locale: string): string {
  const { results, summary: lines } = text;
  const money = (amount: number) => formatRupiah(amount, locale);
  const nameOf = (id: string) => bill.members.find((member) => member.id === id)?.name ?? "";
  const settledKeys = new Set(bill.settled.map(transferKey));
  const paidCount = summary.transfers.filter((transfer) => settledKeys.has(transferKey(transfer))).length;

  const output = [
    fillTemplate(lines.title, { date }),
    fillTemplate(lines.line, { label: results.total, amount: money(summary.total) }),
    fillTemplate(lines.line, { label: results.perPerson, amount: money(summary.perPerson) }),
    "",
    results.categories,
    ...summary.categories.map((entry) =>
      fillTemplate(lines.category, { name: text.categories[entry.category], amount: money(entry.amount), percentage: entry.percentage }),
    ),
    "",
    results.breakdownHeading,
    ...summary.balances.map((balance) =>
      fillTemplate(lines.member, {
        name: balance.name,
        share: money(balance.share),
        paid: money(balance.paid),
        status: netText(balance, results, locale),
      }),
    ),
    "",
    results.transfersHeading,
  ];

  if (summary.transfers.length === 0) {
    output.push(results.allEven);
  } else {
    summary.transfers.forEach((transfer) => {
      output.push(
        fillTemplate(lines.transfer, {
          from: nameOf(transfer.fromMemberId),
          to: nameOf(transfer.toMemberId),
          amount: money(transfer.amount),
          status: settledKeys.has(transferKey(transfer)) ? lines.settled : lines.open,
        }),
      );
    });
    output.push(fillTemplate(results.progress, { paid: paidCount, total: summary.transfers.length }));
  }
  return output.join("\n");
}
