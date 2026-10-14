import type { Locale } from "@/lib/locale";

// Amount fields accept a little arithmetic ("150.000 + 25.000", "3 * 45.000", "200.000 * 10%"), read by a small
// parser instead of being evaluated as code. Numbers follow the reader's language: Indonesian groups thousands
// with dots and writes decimals after a comma, English the other way round.

type Token = { kind: "number"; value: number } | { kind: "symbol"; value: string };

/** Characters an amount field lets through: digits, separators, spaces, and the arithmetic signs. */
export const AMOUNT_CHARACTERS = /^[0-9+\-*/%.,() ]*$/;

function readNumber(text: string, locale: Locale): number | null {
  const decimalMark = locale === "id" ? "," : ".";
  const groupMark = locale === "id" ? "." : ",";

  if (text.includes(decimalMark)) {
    const [whole, fraction, ...rest] = text.split(decimalMark);
    if (rest.length > 0 || fraction.includes(groupMark)) return null;
    const value = Number(`${whole.split(groupMark).join("") || "0"}.${fraction || "0"}`);
    return Number.isFinite(value) ? value : null;
  }

  const parts = text.split(groupMark);
  const grouped = parts.slice(1).every((part) => part.length === 3);
  // "12.5" typed in Indonesian means twelve and a half: a group mark not followed by three digits is a decimal point.
  if (parts.length === 2 && !grouped) {
    const value = Number(`${parts[0] || "0"}.${parts[1]}`);
    return Number.isFinite(value) ? value : null;
  }
  if (!grouped || parts.some((part) => part === "" && parts.length > 1)) return null;
  const value = Number(parts.join(""));
  return Number.isFinite(value) ? value : null;
}

function tokenize(text: string, locale: Locale): Token[] | null {
  const tokens: Token[] = [];
  const pattern = /\s*(?:([0-9.,]+)|([+\-*/%()]))/y;
  let position = 0;
  while (position < text.length) {
    pattern.lastIndex = position;
    const match = pattern.exec(text);
    if (!match) {
      if (text.slice(position).trim() === "") break;
      return null;
    }
    position = pattern.lastIndex;
    if (match[1] !== undefined) {
      const value = readNumber(match[1], locale);
      if (value === null) return null;
      tokens.push({ kind: "number", value });
    } else {
      tokens.push({ kind: "symbol", value: match[2] });
    }
  }
  return tokens;
}

class Reader {
  private index = 0;
  private readonly tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  done(): boolean {
    return this.index >= this.tokens.length;
  }

  private peekSymbol(): string | null {
    const token = this.tokens[this.index];
    return token?.kind === "symbol" ? token.value : null;
  }

  sum(): number {
    let value = this.product();
    let symbol = this.peekSymbol();
    while (symbol === "+" || symbol === "-") {
      this.index += 1;
      const right = this.product();
      value = symbol === "+" ? value + right : value - right;
      symbol = this.peekSymbol();
    }
    return value;
  }

  private product(): number {
    let value = this.signed();
    let symbol = this.peekSymbol();
    while (symbol === "*" || symbol === "/") {
      this.index += 1;
      const right = this.signed();
      value = symbol === "*" ? value * right : value / right;
      symbol = this.peekSymbol();
    }
    return value;
  }

  private signed(): number {
    const symbol = this.peekSymbol();
    if (symbol === "-" || symbol === "+") {
      this.index += 1;
      const value = this.signed();
      return symbol === "-" ? -value : value;
    }
    return this.percent();
  }

  private percent(): number {
    let value = this.primary();
    while (this.peekSymbol() === "%") {
      this.index += 1;
      value /= 100;
    }
    return value;
  }

  private primary(): number {
    const token = this.tokens[this.index];
    if (!token) throw new Error("An amount ended too early");
    this.index += 1;
    if (token.kind === "number") return token.value;
    if (token.value !== "(") throw new Error("An amount has a sign out of place");
    const value = this.sum();
    if (this.peekSymbol() !== ")") throw new Error("An amount has an open bracket");
    this.index += 1;
    return value;
  }
}

/** The value of what was typed in an amount field: 0 when it is empty, null when it cannot be worked out. */
export function evaluateAmount(text: string, locale: Locale): number | null {
  if (text.trim() === "") return 0;
  const tokens = tokenize(text, locale);
  if (!tokens || tokens.length === 0) return null;
  try {
    const reader = new Reader(tokens);
    const value = reader.sum();
    return reader.done() && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** A tax typed as "11%" is a share of the base amount; anything else is an amount of its own. */
export function isPercentTax(text: string): boolean {
  return text.trim().endsWith("%");
}

export type ExpenseAmounts = {
  base: number;
  tax: number;
  /** The rate when the tax was typed as a percentage. */
  taxRate: number | null;
  extra: number;
  /** Whole Rupiah, as the expense is kept. */
  total: number;
};

/** The parts of an expense and its total, or null when one of the fields cannot be worked out or is negative. */
export function expenseAmounts(baseInput: string, taxInput: string, extraInput: string, locale: Locale): ExpenseAmounts | null {
  const base = evaluateAmount(baseInput, locale);
  const extra = evaluateAmount(extraInput, locale);
  const percent = isPercentTax(taxInput);
  const taxValue = evaluateAmount(percent ? taxInput.trim().slice(0, -1) : taxInput, locale);
  if (base === null || extra === null || taxValue === null) return null;
  if (base < 0 || extra < 0 || taxValue < 0) return null;
  const tax = percent ? (base * taxValue) / 100 : taxValue;
  return { base, tax, taxRate: percent ? taxValue : null, extra, total: Math.round(base + tax + extra) };
}

/** The worked-out value written back into a field when the visitor presses Enter or "=". */
export function formatTypedAmount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

type TypedExpense = { amount: number; baseAmountInput: string; taxInput: string; extraInput: string };

/**
 * The parts of a saved expense. Its fields were typed in the language the screen had then, so they are read in
 * the current language first and in the other one when that does not add up to the saved amount.
 */
export function savedExpenseAmounts(expense: TypedExpense, locale: Locale): { amounts: ExpenseAmounts; typedIn: Locale } | null {
  const candidates: Locale[] = locale === "id" ? ["id", "en"] : ["en", "id"];
  for (const candidate of candidates) {
    const amounts = expenseAmounts(expense.baseAmountInput, expense.taxInput, expense.extraInput, candidate);
    if (amounts && amounts.total === expense.amount) return { amounts, typedIn: candidate };
  }
  return null;
}

/** A saved expense's fields as they should be shown for editing in the current language. */
export function editableInputs(expense: TypedExpense, locale: Locale): { base: string; tax: string; extra: string } {
  const saved = savedExpenseAmounts(expense, locale);
  if (!saved) return { base: formatTypedAmount(expense.amount, locale), tax: "", extra: "" };
  if (saved.typedIn === locale) return { base: expense.baseAmountInput, tax: expense.taxInput, extra: expense.extraInput };
  const { amounts } = saved;
  const written = (input: string, value: number) => (input.trim() === "" ? "" : formatTypedAmount(value, locale));
  return {
    base: formatTypedAmount(amounts.base, locale),
    tax: amounts.taxRate !== null ? `${formatTypedAmount(amounts.taxRate, locale)}%` : written(expense.taxInput, amounts.tax),
    extra: written(expense.extraInput, amounts.extra),
  };
}
