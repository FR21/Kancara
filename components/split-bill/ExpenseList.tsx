"use client";

import { Pencil, ReceiptText, Trash2 } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import IconButton from "@/components/ui/IconButton";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { useListArrival } from "@/components/ui/use-list-arrival";
import type { Locale } from "@/lib/locale";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { savedExpenseAmounts } from "@/lib/split-bill/amount";
import type { BillExpense, SplitBill } from "@/lib/split-bill/bill";
import { formatPercent, formatRupiah } from "@/lib/split-bill/format";
import { plural } from "@/lib/trips/format";
import { CATEGORY_ICONS } from "./category-icons";

type ExpenseListProps = {
  bill: SplitBill;
  editingId: string | null;
  text: Messages["splitBill"]["expenses"];
  categories: Messages["splitBill"]["categories"];
  locale: Locale;
  onEdit: (expense: BillExpense) => void;
  onRemove: (expense: BillExpense) => void;
};

/** How an expense with tax or an extra fee was made up, such as "Rp 200.000 nominal, +11% pajak". */
function breakdownOf(expense: BillExpense, text: ExpenseListProps["text"], locale: Locale): string[] {
  const saved = savedExpenseAmounts(expense, locale);
  if (!saved) return [];
  const { amounts } = saved;
  if (amounts.tax <= 0 && amounts.extra <= 0) return [];
  const money = (amount: number) => formatRupiah(amount, locale);
  const notes = [fillTemplate(text.noteBase, { amount: money(amounts.base) })];
  if (amounts.tax > 0) {
    notes.push(
      amounts.taxRate !== null
        ? fillTemplate(text.noteTaxRate, { rate: formatPercent(amounts.taxRate, locale) })
        : fillTemplate(text.noteTax, { amount: money(amounts.tax) }),
    );
  }
  if (amounts.extra > 0) notes.push(fillTemplate(text.noteExtra, { amount: money(amounts.extra) }));
  return notes;
}

export default function ExpenseList({ bill, editingId, text, categories, locale, onEdit, onRemove }: ExpenseListProps) {
  const arrivalOf = useListArrival(bill.expenses.map((expense) => expense.id));

  if (bill.expenses.length === 0) return <EmptyState icon={ReceiptText} title={text.emptyTitle} body={text.empty} headingLevel={4} />;

  const memberIndex = new Map(bill.members.map((member, index) => [member.id, index]));
  const nameOf = (id: string) => bill.members.find((member) => member.id === id)?.name ?? "";

  return (
    <ul className="divide-y divide-border overflow-clip rounded-surface border border-border bg-surface">
      {bill.expenses.map((expense) => {
        const Icon = CATEGORY_ICONS[expense.category];
        const sharedByEveryone = expense.sharedByMemberIds.length === bill.members.length;
        const notes = breakdownOf(expense, text, locale);
        const arrival = arrivalOf(expense.id);
        return (
          <li
            key={expense.id}
            style={arrival.style}
            className={`flex items-start gap-3 px-surface py-4 transition-colors duration-150 ease-out ${editingId === expense.id ? "bg-primary-subtle" : ""} ${arrival.className}`}
          >
            <MemberAvatar ageGroup="adult" variant={memberIndex.get(expense.paidByMemberId) ?? 0} className="size-10" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="min-w-0 text-label-lg break-words text-text">{expense.description}</p>
                <p className="font-heading text-label-lg text-text tabular-nums">{formatRupiah(expense.amount, locale)}</p>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-caption text-text-muted">
                <span className="inline-flex items-center gap-1">
                  <Icon className="size-4 text-primary" aria-hidden="true" />
                  {categories[expense.category]}
                </span>
                <span aria-hidden="true">·</span>
                <span>{fillTemplate(text.paidBy, { name: nameOf(expense.paidByMemberId) })}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {sharedByEveryone ? text.sharedByEveryone : plural(text.sharedByCount, expense.sharedByMemberIds.length, locale)}
                </span>
              </p>
              {notes.length > 0 && <p className="mt-1 text-caption text-text-muted tabular-nums">{notes.join(" · ")}</p>}
            </div>
            <div className="-my-2 -mr-2 flex shrink-0 flex-col sm:flex-row">
              <IconButton label={fillTemplate(text.edit, { name: expense.description })} onClick={() => onEdit(expense)}>
                <Pencil className="size-4" aria-hidden="true" />
              </IconButton>
              <IconButton label={fillTemplate(text.remove, { name: expense.description })} onClick={() => onRemove(expense)} className="group/remove">
                <Trash2 className="size-5 transition-colors duration-150 group-hover/remove:text-error" aria-hidden="true" />
              </IconButton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
