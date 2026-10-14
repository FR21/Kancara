import { type ExpenseCategory, type SettledTransfer, type SplitBill, EXPENSE_CATEGORIES } from "./bill";

// Who owes whom. Every amount is whole Rupiah: an expense is split so the shares add up to it exactly, the extra
// Rupiah going to the first people in the group's order, so balances, the per-person lines, and the transfers
// always agree with each other.

export type ShareLine = {
  expenseId: string;
  description: string;
  category: ExpenseCategory;
  total: number;
  share: number;
  paidByMemberId: string;
  sharedBy: number;
};

export type MemberBalance = {
  memberId: string;
  name: string;
  /** The member's place in the group, which picks their avatar. */
  position: number;
  paid: number;
  share: number;
  /** Positive when the member gets money back, negative when they still owe. */
  net: number;
  lines: ShareLine[];
};

export type CategoryTotal = { category: ExpenseCategory; amount: number; percentage: number };

export type BillSummary = {
  total: number;
  perPerson: number;
  balances: MemberBalance[];
  /** The fewest transfers that settle everyone, largest debts first. */
  transfers: SettledTransfer[];
  categories: CategoryTotal[];
};

/** Splits whole Rupiah into `count` whole shares that add up to the amount. */
function splitEvenly(amount: number, count: number): number[] {
  const each = Math.floor(amount / count);
  const left = amount - each * count;
  return Array.from({ length: count }, (_, index) => each + (index < left ? 1 : 0));
}

function settle(balances: MemberBalance[]): SettledTransfer[] {
  const byLargest = (first: { amount: number }, second: { amount: number }) => second.amount - first.amount;
  const debtors = balances.filter((balance) => balance.net < 0).map((balance) => ({ id: balance.memberId, amount: -balance.net }));
  const creditors = balances.filter((balance) => balance.net > 0).map((balance) => ({ id: balance.memberId, amount: balance.net }));
  debtors.sort(byLargest);
  creditors.sort(byLargest);

  const transfers: SettledTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);
    if (amount > 0) transfers.push({ fromMemberId: debtor.id, toMemberId: creditor.id, amount });
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) debtorIndex += 1;
    if (creditor.amount === 0) creditorIndex += 1;
  }
  return transfers;
}

export function settleUp(bill: SplitBill): BillSummary {
  const positions = new Map(bill.members.map((member, index) => [member.id, index]));
  const balances: MemberBalance[] = bill.members.map((member, index) => ({
    memberId: member.id,
    name: member.name,
    position: index,
    paid: 0,
    share: 0,
    net: 0,
    lines: [],
  }));
  const balanceOf = new Map(balances.map((balance) => [balance.memberId, balance]));

  bill.expenses.forEach((expense) => {
    const payer = balanceOf.get(expense.paidByMemberId);
    if (payer) payer.paid += expense.amount;
    const sharers = expense.sharedByMemberIds
      .filter((id) => balanceOf.has(id))
      .sort((first, second) => (positions.get(first) ?? 0) - (positions.get(second) ?? 0));
    const shares = splitEvenly(expense.amount, Math.max(sharers.length, 1));
    sharers.forEach((id, index) => {
      const balance = balanceOf.get(id);
      if (!balance) return;
      balance.share += shares[index];
      balance.lines.push({
        expenseId: expense.id,
        description: expense.description,
        category: expense.category,
        total: expense.amount,
        share: shares[index],
        paidByMemberId: expense.paidByMemberId,
        sharedBy: sharers.length,
      });
    });
  });
  balances.forEach((balance) => {
    balance.net = balance.paid - balance.share;
  });

  const total = bill.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const categories = EXPENSE_CATEGORIES.map((category) => {
    const amount = bill.expenses
      .filter((expense) => expense.category === category)
      .reduce((sum, expense) => sum + expense.amount, 0);
    return { category, amount, percentage: total > 0 ? Math.round((amount / total) * 100) : 0 };
  }).filter((entry) => entry.amount > 0);

  return {
    total,
    perPerson: bill.members.length > 0 ? Math.round(total / bill.members.length) : 0,
    balances,
    transfers: settle(balances),
    categories,
  };
}
