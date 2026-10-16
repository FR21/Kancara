"use client";

import { ArrowRight } from "lucide-react";
import { type Ref, useId, useRef, useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { buttonClass } from "@/components/ui/styles";
import type { Locale } from "@/lib/locale";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { type BillExpense, type SplitBill, BILL_LIMITS } from "@/lib/split-bill/bill";
import { plural } from "@/lib/trips/format";
import ExpenseForm from "./ExpenseForm";
import ExpenseList from "./ExpenseList";
import DeckFooter from "@/components/plan/DeckFooter";
import { NEXT_ARROW } from "./stage-arrows";

type ExpensesStageProps = {
  bill: SplitBill;
  text: Messages["splitBill"]["expenses"];
  categories: Messages["splitBill"]["categories"];
  locale: Locale;
  headingRef: Ref<HTMLHeadingElement>;
  onSave: (expense: BillExpense) => void;
  onRemove: (expenseId: string) => void;
  onBack: () => void;
  onNext: () => void;
};

export default function ExpensesStage({ bill, text, categories, locale, headingRef, onSave, onRemove, onBack, onNext }: ExpensesStageProps) {
  const [editing, setEditing] = useState<BillExpense | null>(null);
  // A new form is mounted after each save, so its fields start empty without being reset one by one.
  const [formRound, setFormRound] = useState(0);
  const [removing, setRemoving] = useState<BillExpense | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const full = !editing && bill.expenses.length >= BILL_LIMITS.expenses;

  const startEditing = (expense: BillExpense) => {
    setEditing(expense);
    setFormRound((round) => round + 1);
    formRef.current?.scrollIntoView({ block: "start" });
  };

  const finishEditing = () => {
    setEditing(null);
    setFormRound((round) => round + 1);
  };

  const save = (expense: BillExpense) => {
    onSave(expense);
    finishEditing();
  };

  const confirmRemove = () => {
    if (!removing) return;
    onRemove(removing.id);
    if (editing?.id === removing.id) finishEditing();
    setRemoving(null);
  };

  return (
    <section aria-labelledby={headingId} className="motion-safe:animate-message-in">
      {/* From 1024px the form and the expenses it records stand side by side. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
        <div
          ref={formRef}
          className={`scroll-mt-28 rounded-surface border bg-surface p-surface transition-colors duration-150 ease-out ${editing ? "border-primary" : "border-border"}`}
        >
          <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-h2 text-balance text-text outline-none">
            {editing ? text.editingHeading : text.heading}
          </h2>
          <div className="mt-6">
            {full ? (
              <p className="text-body text-text-muted">{fillTemplate(text.full, { count: BILL_LIMITS.expenses })}</p>
            ) : (
              <ExpenseForm
                key={`${editing?.id ?? "new"}-${formRound}`}
                members={bill.members}
                editing={editing}
                text={text}
                categories={categories}
                locale={locale}
                focusOnMount={formRound > 0}
                onSave={save}
                onCancel={finishEditing}
              />
            )}
          </div>
        </div>

        <div>
          <h3 className="flex flex-wrap items-baseline justify-between gap-x-3 text-h3 text-text">
            {text.listHeading}
            <span className="text-label text-text-muted tabular-nums">{plural(text.count, bill.expenses.length, locale)}</span>
          </h3>
          <div className="mt-4">
            <ExpenseList
              bill={bill}
              editingId={editing?.id ?? null}
              text={text}
              categories={categories}
              locale={locale}
              onEdit={startEditing}
              onRemove={setRemoving}
            />
          </div>
        </div>
      </div>

      {/* Saving an expense is the step's one main action, so moving on is drawn quieter. */}
      <div className="mt-8">
        <DeckFooter backLabel={text.back} onBack={onBack} note={null}>
          <button type="button" disabled={bill.expenses.length === 0} onClick={onNext} className={`group ${buttonClass("outline")}`}>
            {text.next}
            <ArrowRight className={NEXT_ARROW} aria-hidden="true" />
          </button>
        </DeckFooter>
      </div>

      <ConfirmDialog
        open={removing !== null}
        title={fillTemplate(text.removeTitle, { name: removing?.description ?? "" })}
        body={text.removeBody}
        cancelLabel={text.cancel}
        confirmLabel={text.removeConfirm}
        pendingLabel={text.removePending}
        pending={false}
        onCancel={() => setRemoving(null)}
        onConfirm={confirmRemove}
      />
    </section>
  );
}
