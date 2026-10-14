// A split bill as the browser edits it and the server keeps it. Members, expenses, and settled transfers carry
// identifiers made where they are created, so a whole bill can be saved again and again without duplicates.

export const EXPENSE_CATEGORIES = ["food", "transport", "lodging", "activity", "shopping", "other"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type BillMember = { id: string; name: string };

export type BillExpense = {
  id: string;
  description: string;
  category: ExpenseCategory;
  /** Whole Rupiah: the base amount with tax and the extra fee added. */
  amount: number;
  paidByMemberId: string;
  /** Who shares this expense, in the group's order. Never empty. */
  sharedByMemberIds: string[];
  /** What was typed, so the expense can be edited as it was entered. */
  baseAmountInput: string;
  taxInput: string;
  extraInput: string;
};

/** A suggested transfer someone has marked as paid. */
export type SettledTransfer = { fromMemberId: string; toMemberId: string; amount: number };

export type SplitBill = {
  id: string;
  members: BillMember[];
  expenses: BillExpense[];
  settled: SettledTransfer[];
};

export const BILL_LIMITS = {
  members: 50,
  expenses: 500,
  nameLength: 40,
  descriptionLength: 80,
  inputLength: 40,
  /** The largest amount a numeric(14,2) column holds in whole Rupiah. */
  amount: 999_999_999_999,
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isBillId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function emptyBill(id: string): SplitBill {
  return { id, members: [], expenses: [], settled: [] };
}

export function hasContent(bill: SplitBill): boolean {
  return bill.members.length > 0 || bill.expenses.length > 0;
}

export function transferKey(transfer: SettledTransfer): string {
  return `${transfer.fromMemberId}:${transfer.toMemberId}:${transfer.amount}`;
}

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return EXPENSE_CATEGORIES.some((category) => category === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWholeAmount(value: unknown, minimum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= BILL_LIMITS.amount;
}

function readText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed : null;
}

function readMembers(value: unknown): BillMember[] | null {
  if (!Array.isArray(value) || value.length > BILL_LIMITS.members) return null;
  const members: BillMember[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || !isBillId(entry.id) || ids.has(entry.id)) return null;
    const name = readText(entry.name, BILL_LIMITS.nameLength);
    if (!name || names.has(name)) return null;
    ids.add(entry.id);
    names.add(name);
    members.push({ id: entry.id, name });
  }
  return members;
}

function readExpense(value: unknown, memberIds: Set<string>): BillExpense | null {
  if (!isRecord(value) || !isBillId(value.id)) return null;
  const description = readText(value.description, BILL_LIMITS.descriptionLength);
  const baseAmountInput = readText(value.baseAmountInput, BILL_LIMITS.inputLength);
  const taxInput = readText(value.taxInput, BILL_LIMITS.inputLength);
  const extraInput = readText(value.extraInput, BILL_LIMITS.inputLength);
  if (!description || baseAmountInput === null || taxInput === null || extraInput === null) return null;
  if (!isExpenseCategory(value.category) || !isWholeAmount(value.amount, 0)) return null;
  if (typeof value.paidByMemberId !== "string" || !memberIds.has(value.paidByMemberId)) return null;

  const shared = value.sharedByMemberIds;
  if (!Array.isArray(shared) || shared.length === 0) return null;
  const sharedByMemberIds = shared.filter((id): id is string => typeof id === "string" && memberIds.has(id));
  if (sharedByMemberIds.length !== shared.length || new Set(sharedByMemberIds).size !== shared.length) return null;

  return {
    id: value.id,
    description,
    category: value.category,
    amount: value.amount,
    paidByMemberId: value.paidByMemberId,
    sharedByMemberIds,
    baseAmountInput,
    taxInput,
    extraInput,
  };
}

function readSettled(value: unknown, memberIds: Set<string>): SettledTransfer[] | null {
  if (!Array.isArray(value) || value.length > BILL_LIMITS.members * BILL_LIMITS.members) return null;
  const settled: SettledTransfer[] = [];
  const keys = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || !isWholeAmount(entry.amount, 1)) return null;
    const { fromMemberId, toMemberId } = entry;
    if (typeof fromMemberId !== "string" || typeof toMemberId !== "string") return null;
    if (!memberIds.has(fromMemberId) || !memberIds.has(toMemberId) || fromMemberId === toMemberId) return null;
    const transfer = { fromMemberId, toMemberId, amount: entry.amount };
    if (keys.has(transferKey(transfer))) return null;
    keys.add(transferKey(transfer));
    settled.push(transfer);
  }
  return settled;
}

/** A whole bill read from untrusted input, or null when any part of it is not valid. */
export function parseBill(value: unknown): SplitBill | null {
  if (!isRecord(value) || !isBillId(value.id)) return null;
  const members = readMembers(value.members);
  if (!members) return null;
  const memberIds = new Set(members.map((member) => member.id));

  if (!Array.isArray(value.expenses) || value.expenses.length > BILL_LIMITS.expenses) return null;
  const expenses: BillExpense[] = [];
  const expenseIds = new Set<string>();
  for (const entry of value.expenses) {
    const expense = readExpense(entry, memberIds);
    if (!expense || expenseIds.has(expense.id)) return null;
    expenseIds.add(expense.id);
    expenses.push(expense);
  }

  const settled = readSettled(value.settled, memberIds);
  if (!settled) return null;
  return { id: value.id, members, expenses, settled };
}
