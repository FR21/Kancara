import { type BillExpense, type SettledTransfer, type SplitBill, BILL_LIMITS, isExpenseCategory, parseBill } from "./bill";
import { newId } from "./edit";
import { settleUp } from "./settle-up";

// Before split bills were kept in the account, a bill lived in this browser's storage: the members by name, the
// expenses with the payer's and sharers' names, and the transfers marked paid as "from->to:amount" keys. The
// first time the screen opens without a saved bill, that copy is turned into one and moved to the account.

const DRAFT_KEY = "kancara-split-bill-draft-v1";
const SETTLED_KEY = "kancara-split-bill-settled-v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStored(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const text = (value: unknown, maxLength: number) => (typeof value === "string" ? value.trim().slice(0, maxLength) : "");

function readExpense(value: unknown, idByName: Map<string, string>): BillExpense | null {
  if (!isRecord(value)) return null;
  const description = text(value.description, BILL_LIMITS.descriptionLength);
  const paidByMemberId = typeof value.paidBy === "string" ? idByName.get(value.paidBy.trim()) : undefined;
  const amount = typeof value.amount === "number" && Number.isFinite(value.amount) ? Math.round(value.amount) : -1;
  if (description === "" || !paidByMemberId || amount < 0 || amount > BILL_LIMITS.amount) return null;

  const sharedNames = Array.isArray(value.sharedBy) ? value.sharedBy : [];
  const shared = [...idByName.entries()]
    .filter(([name]) => sharedNames.some((entry) => typeof entry === "string" && entry.trim() === name))
    .map(([, id]) => id);
  return {
    id: newId(),
    description,
    category: isExpenseCategory(value.category) ? value.category : "other",
    amount,
    paidByMemberId,
    sharedByMemberIds: shared.length > 0 ? shared : [...idByName.values()],
    baseAmountInput: text(value.baseAmount, BILL_LIMITS.inputLength) || String(amount),
    taxInput: text(value.rawTax, BILL_LIMITS.inputLength),
    extraInput: text(value.extraAmount, BILL_LIMITS.inputLength),
  };
}

function readSettled(bill: SplitBill, nameById: Map<string, string>): SettledTransfer[] {
  const stored = readStored(SETTLED_KEY);
  if (!isRecord(stored)) return [];
  const marked = Object.entries(stored)
    .filter(([, paid]) => paid === true)
    .map(([key]) => key);
  // Old amounts kept cents; a mark still applies to the same two people and the same amount in whole Rupiah.
  return settleUp(bill).transfers.filter((transfer) =>
    marked.some((key) => {
      const match = /^(.*)->(.*):([\d.]+)$/.exec(key);
      return (
        match !== null &&
        match[1] === nameById.get(transfer.fromMemberId) &&
        match[2] === nameById.get(transfer.toMemberId) &&
        Math.abs(Number(match[3]) - transfer.amount) <= 1
      );
    }),
  );
}

/** The bill kept in this browser, as a bill with the given id, or null when there is none worth moving. */
export function readLegacyBill(id: string): SplitBill | null {
  const stored = readStored(DRAFT_KEY);
  if (!isRecord(stored)) return null;

  const idByName = new Map<string, string>();
  (Array.isArray(stored.members) ? stored.members : []).forEach((entry) => {
    const name = text(entry, BILL_LIMITS.nameLength);
    if (name !== "" && !idByName.has(name) && idByName.size < BILL_LIMITS.members) idByName.set(name, newId());
  });
  const members = [...idByName.entries()].map(([name, memberId]) => ({ id: memberId, name }));
  const expenses = (Array.isArray(stored.expenses) ? stored.expenses : [])
    .flatMap((entry) => readExpense(entry, idByName) ?? [])
    .slice(0, BILL_LIMITS.expenses);
  if (members.length === 0) return null;

  const bill: SplitBill = { id, members, expenses, settled: [] };
  const nameById = new Map(members.map((member) => [member.id, member.name]));
  return parseBill({ ...bill, settled: readSettled(bill, nameById) });
}

export function forgetLegacyBill(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(SETTLED_KEY);
  } catch {
    // Storage that cannot be written to cannot be read either, so the old copy is not offered again.
  }
}
