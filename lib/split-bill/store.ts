import "server-only";
import { Prisma } from "@prisma/client";
import type { Viewer } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { type BillExpense, type SettledTransfer, type SplitBill, isBillId, isExpenseCategory, transferKey } from "./bill";

export type SaveResult = "saved" | "conflict";
export type DeleteResult = "deleted" | "notFound";

// Every query here is limited to the viewer's workspace and skips rows that were deleted. A bill is saved whole:
// the rows are compared with what arrived, changed rows are updated, missing ones are marked deleted, new ones
// are created, all in one transaction so a bill is never half saved.

const TRANSACTION = { maxWait: 5000, timeout: 15000 };

const toRupiah = (amount: Prisma.Decimal) => Math.round(amount.toNumber());

/** The bill the viewer worked on last, or null when they have none. */
export async function getLatestBill(viewer: Viewer): Promise<SplitBill | null> {
  const live = { workspaceId: viewer.workspaceId, deletedAt: null };
  const record = await prisma.splitBill.findFirst({
    where: { ...live, userId: viewer.userId },
    orderBy: { updatedAt: "desc" },
    select: {
      splitBillId: true,
      members: { where: live, orderBy: { position: "asc" }, select: { splitBillMemberId: true, name: true } },
      expenses: {
        where: live,
        orderBy: { position: "asc" },
        select: {
          splitBillExpenseId: true,
          description: true,
          category: true,
          amount: true,
          paidByMemberId: true,
          baseAmountInput: true,
          taxInput: true,
          extraInput: true,
          shares: { where: live, select: { splitBillMemberId: true } },
        },
      },
      settlements: { where: live, select: { fromMemberId: true, toMemberId: true, amount: true } },
    },
  });
  if (!record) return null;

  const members = record.members.map((member) => ({ id: member.splitBillMemberId, name: member.name }));
  const memberIds = members.map((member) => member.id);
  const isMember = (id: string) => memberIds.includes(id);

  const expenses: BillExpense[] = record.expenses
    .filter((expense) => isMember(expense.paidByMemberId))
    .map((expense) => {
      const shared = memberIds.filter((id) => expense.shares.some((share) => share.splitBillMemberId === id));
      return {
        id: expense.splitBillExpenseId,
        description: expense.description,
        category: isExpenseCategory(expense.category) ? expense.category : "other",
        amount: toRupiah(expense.amount),
        paidByMemberId: expense.paidByMemberId,
        sharedByMemberIds: shared.length > 0 ? shared : memberIds,
        baseAmountInput: expense.baseAmountInput,
        taxInput: expense.taxInput,
        extraInput: expense.extraInput,
      };
    });

  const settled: SettledTransfer[] = record.settlements
    .filter((settlement) => isMember(settlement.fromMemberId) && isMember(settlement.toMemberId))
    .map((settlement) => ({
      fromMemberId: settlement.fromMemberId,
      toMemberId: settlement.toMemberId,
      amount: toRupiah(settlement.amount),
    }));

  return { id: record.splitBillId, members, expenses, settled };
}

type Transaction = Prisma.TransactionClient;
type Scope = { workspaceId: string; splitBillId: string };

async function saveMembers(transaction: Transaction, scope: Scope, bill: SplitBill, now: Date) {
  const stored = await transaction.splitBillMember.findMany({
    where: { ...scope, deletedAt: null },
    select: { splitBillMemberId: true, name: true, position: true },
  });
  const wanted = new Set(bill.members.map((member) => member.id));
  const gone = stored.filter((member) => !wanted.has(member.splitBillMemberId)).map((member) => member.splitBillMemberId);
  if (gone.length > 0) {
    await transaction.splitBillMember.updateMany({
      where: { ...scope, splitBillMemberId: { in: gone } },
      data: { deletedAt: now },
    });
  }

  const storedById = new Map(stored.map((member) => [member.splitBillMemberId, member]));
  for (const [position, member] of bill.members.entries()) {
    const before = storedById.get(member.id);
    if (!before || (before.name === member.name && before.position === position)) continue;
    await transaction.splitBillMember.updateMany({
      where: { ...scope, splitBillMemberId: member.id, deletedAt: null },
      data: { name: member.name, position },
    });
  }

  const added = bill.members
    .map((member, position) => ({ member, position }))
    .filter(({ member }) => !storedById.has(member.id));
  if (added.length > 0) {
    await transaction.splitBillMember.createMany({
      data: added.map(({ member, position }) => ({ ...scope, splitBillMemberId: member.id, name: member.name, position })),
    });
  }
}

function expenseColumns(expense: BillExpense, position: number) {
  return {
    description: expense.description,
    category: expense.category,
    amount: new Prisma.Decimal(expense.amount),
    paidByMemberId: expense.paidByMemberId,
    baseAmountInput: expense.baseAmountInput,
    taxInput: expense.taxInput,
    extraInput: expense.extraInput,
    position,
  };
}

async function saveExpenses(transaction: Transaction, scope: Scope, bill: SplitBill, now: Date) {
  const stored = await transaction.splitBillExpense.findMany({
    where: { ...scope, deletedAt: null },
    select: {
      splitBillExpenseId: true,
      description: true,
      category: true,
      amount: true,
      paidByMemberId: true,
      baseAmountInput: true,
      taxInput: true,
      extraInput: true,
      position: true,
    },
  });
  const wanted = new Set(bill.expenses.map((expense) => expense.id));
  const gone = stored.filter((expense) => !wanted.has(expense.splitBillExpenseId)).map((expense) => expense.splitBillExpenseId);
  if (gone.length > 0) {
    await transaction.splitBillExpense.updateMany({
      where: { ...scope, splitBillExpenseId: { in: gone } },
      data: { deletedAt: now },
    });
  }

  const storedById = new Map(stored.map((expense) => [expense.splitBillExpenseId, expense]));
  for (const [position, expense] of bill.expenses.entries()) {
    const before = storedById.get(expense.id);
    if (!before) continue;
    const columns = expenseColumns(expense, position);
    const unchanged =
      before.description === columns.description &&
      before.category === columns.category &&
      before.amount.equals(columns.amount) &&
      before.paidByMemberId === columns.paidByMemberId &&
      before.baseAmountInput === columns.baseAmountInput &&
      before.taxInput === columns.taxInput &&
      before.extraInput === columns.extraInput &&
      before.position === position;
    if (unchanged) continue;
    await transaction.splitBillExpense.updateMany({
      where: { ...scope, splitBillExpenseId: expense.id, deletedAt: null },
      data: columns,
    });
  }

  const added = bill.expenses
    .map((expense, position) => ({ expense, position }))
    .filter(({ expense }) => !storedById.has(expense.id));
  if (added.length > 0) {
    await transaction.splitBillExpense.createMany({
      data: added.map(({ expense, position }) => ({ ...scope, splitBillExpenseId: expense.id, ...expenseColumns(expense, position) })),
    });
  }
}

async function saveShares(transaction: Transaction, scope: Scope, bill: SplitBill, now: Date) {
  const { workspaceId, splitBillId } = scope;
  const stored = await transaction.splitBillExpenseShare.findMany({
    where: { workspaceId, deletedAt: null, expense: { workspaceId, splitBillId } },
    select: { splitBillExpenseShareId: true, splitBillExpenseId: true, splitBillMemberId: true },
  });
  const pairKey = (expenseId: string, memberId: string) => `${expenseId}:${memberId}`;
  const wanted = new Set(
    bill.expenses.flatMap((expense) => expense.sharedByMemberIds.map((memberId) => pairKey(expense.id, memberId))),
  );
  const storedKeys = new Set(stored.map((share) => pairKey(share.splitBillExpenseId, share.splitBillMemberId)));

  const gone = stored
    .filter((share) => !wanted.has(pairKey(share.splitBillExpenseId, share.splitBillMemberId)))
    .map((share) => share.splitBillExpenseShareId);
  if (gone.length > 0) {
    await transaction.splitBillExpenseShare.updateMany({
      where: { workspaceId, splitBillExpenseShareId: { in: gone } },
      data: { deletedAt: now },
    });
  }

  const added = bill.expenses.flatMap((expense) =>
    expense.sharedByMemberIds
      .filter((memberId) => !storedKeys.has(pairKey(expense.id, memberId)))
      .map((memberId) => ({ workspaceId, splitBillExpenseId: expense.id, splitBillMemberId: memberId })),
  );
  if (added.length > 0) await transaction.splitBillExpenseShare.createMany({ data: added });
}

async function saveSettlements(transaction: Transaction, scope: Scope, bill: SplitBill, now: Date) {
  const stored = await transaction.splitBillSettlement.findMany({
    where: { ...scope, deletedAt: null },
    select: { splitBillSettlementId: true, fromMemberId: true, toMemberId: true, amount: true },
  });
  const keyOf = (settlement: (typeof stored)[number]) =>
    transferKey({ fromMemberId: settlement.fromMemberId, toMemberId: settlement.toMemberId, amount: toRupiah(settlement.amount) });
  const wanted = new Set(bill.settled.map(transferKey));
  const storedKeys = new Set(stored.map(keyOf));

  const gone = stored.filter((settlement) => !wanted.has(keyOf(settlement))).map((settlement) => settlement.splitBillSettlementId);
  if (gone.length > 0) {
    await transaction.splitBillSettlement.updateMany({
      where: { ...scope, splitBillSettlementId: { in: gone } },
      data: { deletedAt: now },
    });
  }

  const added = bill.settled.filter((transfer) => !storedKeys.has(transferKey(transfer)));
  if (added.length > 0) {
    await transaction.splitBillSettlement.createMany({
      data: added.map((transfer) => ({
        ...scope,
        fromMemberId: transfer.fromMemberId,
        toMemberId: transfer.toMemberId,
        amount: new Prisma.Decimal(transfer.amount),
        settledAt: now,
      })),
    });
  }
}

/**
 * Saves a whole bill, creating it the first time its identifier is seen. "conflict" when the identifier belongs
 * to a bill that was deleted or to someone else, or a member or expense identifier is already in use elsewhere.
 */
export async function saveBill(viewer: Viewer, bill: SplitBill): Promise<SaveResult> {
  const scope = { workspaceId: viewer.workspaceId, splitBillId: bill.id };
  try {
    return await prisma.$transaction(async (transaction) => {
      const now = new Date();
      const existing = await transaction.splitBill.findFirst({ where: scope, select: { deletedAt: true } });
      if (existing?.deletedAt) return "conflict";
      if (existing) {
        await transaction.splitBill.updateMany({ where: { ...scope, deletedAt: null }, data: { updatedAt: now } });
      } else {
        await transaction.splitBill.create({ data: { ...scope, userId: viewer.userId } });
      }
      await saveMembers(transaction, scope, bill, now);
      await saveExpenses(transaction, scope, bill, now);
      await saveShares(transaction, scope, bill, now);
      await saveSettlements(transaction, scope, bill, now);
      return "saved";
    }, TRANSACTION);
  } catch (caught) {
    // P2002: an identifier that is taken; P2003: a reference to a row that is not in this bill.
    if (caught instanceof Prisma.PrismaClientKnownRequestError && (caught.code === "P2002" || caught.code === "P2003")) {
      return "conflict";
    }
    throw caught;
  }
}

/** Marks a bill and everything in it deleted. */
export async function deleteBill(viewer: Viewer, id: string): Promise<DeleteResult> {
  if (!isBillId(id)) return "notFound";
  const scope = { workspaceId: viewer.workspaceId, splitBillId: id };
  return prisma.$transaction(async (transaction) => {
    const now = new Date();
    const deleted = await transaction.splitBill.updateMany({
      where: { ...scope, userId: viewer.userId, deletedAt: null },
      data: { deletedAt: now },
    });
    if (deleted.count === 0) return "notFound";
    const live = { ...scope, deletedAt: null };
    await transaction.splitBillSettlement.updateMany({ where: live, data: { deletedAt: now } });
    await transaction.splitBillExpenseShare.updateMany({
      where: { workspaceId: viewer.workspaceId, deletedAt: null, expense: { workspaceId: viewer.workspaceId, splitBillId: id } },
      data: { deletedAt: now },
    });
    await transaction.splitBillExpense.updateMany({ where: live, data: { deletedAt: now } });
    await transaction.splitBillMember.updateMany({ where: live, data: { deletedAt: now } });
    return "deleted";
  }, TRANSACTION);
}
