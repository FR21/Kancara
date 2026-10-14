import { type BillExpense, type SettledTransfer, type SplitBill, BILL_LIMITS, transferKey } from "./bill";
import { settleUp } from "./settle-up";

// The changes the split bill screen makes, as plain functions from one bill to the next.

/** A random identifier. randomUUID is missing outside secure origins (a phone testing over the local network). */
export function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// A transfer marked paid stays marked only while it is still one of the suggested transfers. Once the expenses
// change the suggestion, the old mark would describe a payment the screen no longer shows.
function keepCurrentSettled(bill: SplitBill): SplitBill {
  const current = new Set(settleUp(bill).transfers.map(transferKey));
  const settled = bill.settled.filter((transfer) => current.has(transferKey(transfer)));
  return settled.length === bill.settled.length ? bill : { ...bill, settled };
}

export function memberNameTaken(bill: SplitBill, name: string): boolean {
  const wanted = name.trim().toLocaleLowerCase();
  return bill.members.some((member) => member.name.toLocaleLowerCase() === wanted);
}

/** Adds the names not in the group yet, up to the limit, and reports how many were added. */
export function addMembers(bill: SplitBill, names: string[]): { bill: SplitBill; added: number } {
  const members = [...bill.members];
  names.forEach((raw) => {
    const name = raw.trim().slice(0, BILL_LIMITS.nameLength);
    if (name === "" || members.length >= BILL_LIMITS.members) return;
    if (memberNameTaken({ ...bill, members }, name)) return;
    members.push({ id: newId(), name });
  });
  const added = members.length - bill.members.length;
  return { bill: added > 0 ? keepCurrentSettled({ ...bill, members }) : bill, added };
}

/** Removes a member with the expenses they paid, and takes them out of the expenses they shared. */
export function removeMember(bill: SplitBill, memberId: string): SplitBill {
  const members = bill.members.filter((member) => member.id !== memberId);
  const everyone = members.map((member) => member.id);
  const expenses = bill.expenses
    .filter((expense) => expense.paidByMemberId !== memberId)
    .map((expense) => {
      const sharedByMemberIds = expense.sharedByMemberIds.filter((id) => id !== memberId);
      return { ...expense, sharedByMemberIds: sharedByMemberIds.length > 0 ? sharedByMemberIds : everyone };
    });
  const settled = bill.settled.filter((transfer) => transfer.fromMemberId !== memberId && transfer.toMemberId !== memberId);
  return keepCurrentSettled({ ...bill, members, expenses, settled });
}

export function paidExpenseCount(bill: SplitBill, memberId: string): number {
  return bill.expenses.filter((expense) => expense.paidByMemberId === memberId).length;
}

/** Adds the expense, or replaces the one with the same id. */
export function saveExpense(bill: SplitBill, expense: BillExpense): SplitBill {
  const exists = bill.expenses.some((entry) => entry.id === expense.id);
  const expenses = exists
    ? bill.expenses.map((entry) => (entry.id === expense.id ? expense : entry))
    : [...bill.expenses, expense].slice(0, BILL_LIMITS.expenses);
  return keepCurrentSettled({ ...bill, expenses });
}

export function removeExpense(bill: SplitBill, expenseId: string): SplitBill {
  return keepCurrentSettled({ ...bill, expenses: bill.expenses.filter((expense) => expense.id !== expenseId) });
}

export function setSettled(bill: SplitBill, transfers: SettledTransfer[], paid: boolean): SplitBill {
  const keys = new Set(transfers.map(transferKey));
  const others = bill.settled.filter((transfer) => !keys.has(transferKey(transfer)));
  return { ...bill, settled: paid ? [...others, ...transfers] : others };
}
