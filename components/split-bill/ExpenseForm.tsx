"use client";

import { Check } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import MemberAvatar from "@/components/ui/MemberAvatar";
import SelectField from "@/components/ui/SelectField";
import RequiredMark from "@/components/ui/RequiredMark";
import { FIELD_LABEL, INPUT, TEXT_LINK, buttonClass, choiceClass, FIELD_DESCRIPTION } from "@/components/ui/styles";
import type { Locale } from "@/lib/locale";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { editableInputs, evaluateAmount, expenseAmounts, formatTypedAmount, isPercentTax } from "@/lib/split-bill/amount";
import { type BillExpense, type BillMember, type ExpenseCategory, BILL_LIMITS, EXPENSE_CATEGORIES } from "@/lib/split-bill/bill";
import { newId } from "@/lib/split-bill/edit";
import { formatRupiah } from "@/lib/split-bill/format";
import AmountField from "./AmountField";
import { CATEGORY_ICONS } from "./category-icons";
import FieldError from "@/components/ui/FieldError";

type ExpenseFormProps = {
  members: BillMember[];
  /** The expense being changed, or null for a new one. */
  editing: BillExpense | null;
  text: Messages["splitBill"]["expenses"];
  categories: Messages["splitBill"]["categories"];
  locale: Locale;
  /** Puts the cursor in the first field, after an expense was just saved or picked for editing. */
  focusOnMount: boolean;
  onSave: (expense: BillExpense) => void;
  onCancel: () => void;
};

const QUICK_TAXES = ["11%", "5%"] as const;
const QUICK_EXTRAS = [5000, 10000] as const;
const ARITHMETIC = /[+\-*/()]/;

export default function ExpenseForm({ members, editing, text, categories, locale, focusOnMount, onSave, onCancel }: ExpenseFormProps) {
  const everyone = members.map((member) => member.id);
  const [description, setDescription] = useState(editing?.description ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(editing?.category ?? "food");
  const [initialInputs] = useState(() => (editing ? editableInputs(editing, locale) : { base: "", tax: "", extra: "" }));
  const [baseInput, setBaseInput] = useState(initialInputs.base);
  const [taxInput, setTaxInput] = useState(initialInputs.tax);
  const [extraInput, setExtraInput] = useState(initialInputs.extra);
  const [payerId, setPayerId] = useState(editing?.paidByMemberId ?? everyone[0] ?? "");
  // An expense shared by everyone is shown with nobody picked, which the hint says means everyone.
  const [sharedBy, setSharedBy] = useState<string[]>(
    editing && editing.sharedByMemberIds.length < everyone.length ? editing.sharedByMemberIds : [],
  );
  const [submitted, setSubmitted] = useState(false);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const descriptionId = useId();
  const descriptionProblemId = useId();
  const payerFieldId = useId();
  const categoryFieldId = useId();
  const CategoryIcon = CATEGORY_ICONS[category];
  const sharedLabelId = useId();
  const sharedHintId = useId();

  useEffect(() => {
    if (focusOnMount) descriptionRef.current?.focus();
  }, [focusOnMount]);

  const base = evaluateAmount(baseInput, locale);
  const extra = evaluateAmount(extraInput, locale);
  const percentTax = isPercentTax(taxInput);
  const taxValue = evaluateAmount(percentTax ? taxInput.trim().slice(0, -1) : taxInput, locale);
  const amounts = expenseAmounts(baseInput, taxInput, extraInput, locale);

  const descriptionProblem = submitted && description.trim() === "" ? text.descriptionMissing : "";
  let baseProblem = "";
  if (base === null || base < 0) baseProblem = text.invalidAmount;
  else if (submitted && base <= 0) baseProblem = text.baseMissing;
  const taxProblem = taxValue === null || taxValue < 0 ? text.invalidAmount : "";
  const extraProblem = extra === null || extra < 0 ? text.invalidAmount : "";

  const money = (amount: number) => formatRupiah(amount, locale);
  const previewOf = (input: string, value: number | null) =>
    value !== null && ARITHMETIC.test(input) ? fillTemplate(text.preview, { amount: money(value) }) : "";
  const taxPreview = percentTax && amounts && amounts.tax > 0 ? fillTemplate(text.preview, { amount: money(amounts.tax) }) : previewOf(taxInput, taxValue);
  const showTotal = amounts !== null && amounts.base > 0 && (amounts.tax > 0 || amounts.extra > 0);

  const evaluateInto = (input: string, setter: (value: string) => void) => {
    const value = evaluateAmount(input, locale);
    if (value !== null && input.trim() !== "") setter(formatTypedAmount(value, locale));
  };
  const evaluateTax = () => {
    if (!percentTax) return evaluateInto(taxInput, setTaxInput);
    if (taxValue !== null) setTaxInput(`${formatTypedAmount(taxValue, locale)}%`);
  };

  const toggleSharer = (memberId: string) =>
    setSharedBy((current) => (current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]));
  const allPicked = sharedBy.length === everyone.length;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    const payer = everyone.includes(payerId) ? payerId : everyone[0];
    if (description.trim() === "" || !amounts || amounts.base <= 0 || !payer) return;
    onSave({
      id: editing?.id ?? newId(),
      description: description.trim().slice(0, BILL_LIMITS.descriptionLength),
      category,
      amount: Math.min(amounts.total, BILL_LIMITS.amount),
      paidByMemberId: payer,
      sharedByMemberIds: sharedBy.length > 0 ? everyone.filter((id) => sharedBy.includes(id)) : everyone,
      baseAmountInput: baseInput.trim(),
      taxInput: taxInput.trim(),
      extraInput: extraInput.trim(),
    });
  };

  // Three groups read top to bottom: what the expense was, how much it came to, and who it is between. Fields
  // of one group sit 16px apart, the groups 24px, so each reads as one block.
  return (
    <form onSubmit={submit} noValidate>
      <div className="space-y-4">
        <div>
          <label htmlFor={descriptionId} className={FIELD_LABEL}>
            {text.descriptionLabel}
            <RequiredMark />
          </label>
          <input
            ref={descriptionRef}
            id={descriptionId}
            type="text"
            autoComplete="off"
            value={description}
            maxLength={BILL_LIMITS.descriptionLength}
            placeholder={text.descriptionPlaceholder}
            aria-invalid={descriptionProblem !== ""}
            aria-describedby={descriptionProblem ? descriptionProblemId : undefined}
            onChange={(event) => setDescription(event.target.value)}
            className={`${INPUT} mt-2 aria-invalid:border-error`}
          />
          {descriptionProblem && (
            <FieldError id={descriptionProblemId} role="alert">{descriptionProblem}</FieldError>
          )}
        </div>

        <div>
          <label htmlFor={categoryFieldId} className={FIELD_LABEL}>
            {text.categoryLabel}
          </label>
          <div className="relative mt-2">
            <CategoryIcon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-primary" />
            <SelectField
              id={categoryFieldId}
              value={category}
              onChange={(event) => {
                const picked = EXPENSE_CATEGORIES.find((key) => key === event.target.value);
                if (picked) setCategory(picked);
              }}
              className="[&_select]:pl-12"
            >
              {EXPENSE_CATEGORIES.map((key) => (
                <option key={key} value={key}>
                  {categories[key]}
                </option>
              ))}
            </SelectField>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <AmountField
          label={text.baseLabel}
          required
          hint={text.baseHint}
          placeholder={text.basePlaceholder}
          value={baseInput}
          problem={baseProblem}
          preview={previewOf(baseInput, base)}
          onChange={setBaseInput}
          onEvaluate={() => evaluateInto(baseInput, setBaseInput)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <AmountField
            label={text.taxLabel}
            hint={text.taxHint}
            placeholder={text.taxPlaceholder}
            value={taxInput}
            problem={taxProblem}
            preview={taxPreview}
            shortcuts={QUICK_TAXES.map((value) => ({ value, label: value === "11%" ? text.taxVat : text.taxService }))}
            onChange={setTaxInput}
            onEvaluate={evaluateTax}
          />
          <AmountField
            label={text.extraLabel}
            hint={text.extraHint}
            placeholder={text.extraPlaceholder}
            value={extraInput}
            problem={extraProblem}
            preview={previewOf(extraInput, extra)}
            shortcuts={QUICK_EXTRAS.map((amount) => ({
              value: formatTypedAmount(amount, locale),
              label: fillTemplate(text.extraShortcut, { amount: money(amount) }),
            }))}
            onChange={setExtraInput}
            onEvaluate={() => evaluateInto(extraInput, setExtraInput)}
          />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor={payerFieldId} className={FIELD_LABEL}>
            {text.paidByLabel}
            <RequiredMark />
          </label>
          <SelectField id={payerFieldId} value={payerId} onChange={(event) => setPayerId(event.target.value)} className="mt-2">
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </SelectField>
        </div>

        <div role="group" aria-labelledby={sharedLabelId} aria-describedby={sharedHintId}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p id={sharedLabelId} className={FIELD_LABEL}>
                {text.sharedByLabel}
              </p>
              <p id={sharedHintId} className={FIELD_DESCRIPTION}>
                {text.sharedByHint}
              </p>
            </div>
            {/* The link keeps its 44px target but lines its words up with the label beside it. */}
            <button type="button" onClick={() => setSharedBy(allPicked ? [] : everyone)} className={`${TEXT_LINK} -mt-3 shrink-0`}>
              {allPicked ? text.clearAll : text.selectAll}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {members.map((member, index) => {
              const picked = sharedBy.includes(member.id);
              return (
                <button key={member.id} type="button" aria-pressed={picked} onClick={() => toggleSharer(member.id)} className={`${choiceClass(picked)} pl-1`}>
                  <MemberAvatar ageGroup="adult" variant={index} className="size-9" />
                  {member.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center">
        {showTotal && amounts && (
          <p className="min-w-0 text-label-lg text-pretty text-text tabular-nums motion-safe:animate-message-in">
            {fillTemplate(text.total, { amount: money(amounts.total) })}
          </p>
        )}
        {/* Side by side at every width: the main action takes the room, cancelling stays beside it. */}
        <div className="flex gap-3 sm:ml-auto">
          {editing && (
            <button type="button" onClick={onCancel} className={buttonClass("ghost")}>
              {text.cancelEdit}
            </button>
          )}
          <button type="submit" className={`${buttonClass("primary")} flex-1 sm:flex-none`}>
            <Check className="size-4" aria-hidden="true" />
            {editing ? text.saveChanges : text.add}
          </button>
        </div>
      </div>
    </form>
  );
}
