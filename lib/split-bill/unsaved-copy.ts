import { type SplitBill, parseBill } from "./bill";

// A bill changed without a connection is kept in this browser until the account has it, so a reload or a closed
// tab on the road loses nothing. One copy per bill, beside the account copy it was changed from.
const PREFIX = "kancara-split-bill-unsaved:";

/** The bill as changed here, and the account copy it was changed from (null when the account had none yet). */
export type UnsavedCopy = { bill: SplitBill; base: SplitBill | null; at: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Bills are compared by content, read through the same parser the server uses, so a copy that only differs in the
// order of its keys, or in what the server tidies up, still counts as the same bill.
function sameBill(first: SplitBill | null, second: SplitBill | null): boolean {
  if (first === null || second === null) return first === second;
  const firstRead = parseBill(first);
  const secondRead = parseBill(second);
  return firstRead !== null && secondRead !== null && JSON.stringify(firstRead) === JSON.stringify(secondRead);
}

function readCopy(key: string): UnsavedCopy | null {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    if (!isRecord(stored) || typeof stored.at !== "number") return null;
    const bill = parseBill(stored.bill);
    const base = stored.base === null ? null : parseBill(stored.base);
    if (!bill || (stored.base !== null && !base)) return null;
    return { bill, base, at: stored.at };
  } catch {
    return null;
  }
}

function copyKeys(): string[] {
  try {
    return Object.keys(localStorage).filter((key) => key.startsWith(PREFIX));
  } catch {
    return [];
  }
}

export function keepUnsavedCopy(copy: UnsavedCopy) {
  try {
    localStorage.setItem(PREFIX + copy.bill.id, JSON.stringify(copy));
  } catch {
    // Storage unavailable or full: the change lasts until the page is closed, and is sent as soon as it can be.
  }
}

export function forgetUnsavedCopy(billId: string) {
  try {
    localStorage.removeItem(PREFIX + billId);
  } catch {
    // Nothing was kept.
  }
}

/**
 * The bill changed here that is newer than the account's copy, if any, to be shown and sent in its place. A copy
 * is newer when the account still holds the bill it was changed from; once the account holds something else, the
 * bill was changed elsewhere since, and the account wins. Every other copy is dropped: only the bill opened here can
 * ever be shown again.
 */
export function takeUnsavedCopy(serverBill: SplitBill, stored: boolean): SplitBill | null {
  const copies = copyKeys().flatMap((key) => {
    const copy = readCopy(key);
    return copy ? [copy] : [];
  });
  const base = stored ? serverBill : null;
  const newest = copies
    .filter((copy) => (stored ? copy.bill.id === serverBill.id : copy.base === null))
    .sort((first, second) => second.at - first.at)[0];
  const keptKey = newest ? PREFIX + newest.bill.id : null;
  copyKeys()
    .filter((key) => key !== keptKey)
    .forEach((key) => forgetUnsavedCopy(key.slice(PREFIX.length)));
  if (!newest) return null;
  if (!sameBill(newest.base, base) || sameBill(newest.bill, serverBill)) {
    forgetUnsavedCopy(newest.bill.id);
    return null;
  }
  return newest.bill;
}
