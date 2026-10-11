import { NextResponse } from "next/server";

export type Expense = {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  category?: string;
  sharedBy?: string[];
};

export type SplitBillRequest = {
  members: string[];
  expenses: Expense[];
};

export type Settlement = {
  from: string;
  to: string;
  amount: number;
};

export type SplitBillResponse = {
  totalExpense: number;
  perPerson: number;
  settlements: Settlement[];
  error?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SplitBillRequest;
    const { members, expenses } = body;

    if (!members || members.length === 0) {
      return NextResponse.json(
        { error: "Members cannot be empty." },
        { status: 400 }
      );
    }

    // Calculate total and per person
    const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const perPerson = totalExpense / members.length;

    // Calculate balances per item
    const balances: Record<string, number> = {};
    members.forEach((m) => (balances[m] = 0));

    expenses.forEach((exp) => {
      // The payer gets credited the full amount
      if (balances[exp.paidBy] !== undefined) {
        balances[exp.paidBy] += exp.amount;
      }
      
      // The consumers get debited their share
      const consumers = exp.sharedBy && exp.sharedBy.length > 0 ? exp.sharedBy : members;
      const splitAmount = exp.amount / consumers.length;
      
      consumers.forEach((m) => {
        if (balances[m] !== undefined) {
          balances[m] -= splitAmount;
        }
      });
    });

    // Separate debtors and creditors
    const debtors = members
      .filter((m) => balances[m] < -0.01)
      .map((m) => ({ name: m, amount: -balances[m] }))
      .sort((a, b) => b.amount - a.amount);

    const creditors = members
      .filter((m) => balances[m] > 0.01)
      .map((m) => ({ name: m, amount: balances[m] }))
      .sort((a, b) => b.amount - a.amount);

    const settlements: Settlement[] = [];
    let d = 0;
    let c = 0;

    while (d < debtors.length && c < creditors.length) {
      const debtor = debtors[d];
      const creditor = creditors[c];

      const amount = Math.min(debtor.amount, creditor.amount);

      if (amount > 0.01) {
        settlements.push({
          from: debtor.name,
          to: creditor.name,
          amount: parseFloat(amount.toFixed(2)),
        });
      }

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount < 0.01) d++;
      if (creditor.amount < 0.01) c++;
    }

    const response: SplitBillResponse = {
      totalExpense,
      perPerson,
      settlements,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }
}
