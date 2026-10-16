"use client";

import { type KeyboardEvent, useId } from "react";
import RequiredMark from "@/components/ui/RequiredMark";
import { FIELD_LABEL, INPUT, choiceClass, FIELD_DESCRIPTION } from "@/components/ui/styles";
import { AMOUNT_CHARACTERS } from "@/lib/split-bill/amount";
import { BILL_LIMITS } from "@/lib/split-bill/bill";
import FieldError from "@/components/ui/FieldError";

export type AmountShortcut = { label: string; value: string };

type AmountFieldProps = {
  label: string;
  /** Marks the label with the red star of a field that must be filled. */
  required?: boolean;
  hint: string;
  placeholder: string;
  value: string;
  /** Shown under the field, for example the worked-out value of a sum or why it cannot be worked out. */
  problem: string;
  preview: string;
  shortcuts?: AmountShortcut[];
  onChange: (value: string) => void;
  /** Replaces a sum with its result, when Enter or "=" is pressed. */
  onEvaluate: () => void;
};

// A field for an amount of money that also takes a little arithmetic. Only digits, separators, and arithmetic
// signs get in; pressing Enter or "=" writes the result in place of the sum.
export default function AmountField({
  label,
  required = false,
  hint,
  placeholder,
  value,
  problem,
  preview,
  shortcuts = [],
  onChange,
  onEvaluate,
}: AmountFieldProps) {
  const inputId = useId();
  const hintId = useId();
  const problemId = useId();

  const evaluateOnKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" && event.key !== "=") return;
    event.preventDefault();
    onEvaluate();
  };

  return (
    <div>
      <label htmlFor={inputId} className={FIELD_LABEL}>
        {label}
        {required && <RequiredMark />}
      </label>
      <p id={hintId} className={FIELD_DESCRIPTION}>
        {hint}
      </p>
      <input
        id={inputId}
        type="text"
        inputMode="text"
        autoComplete="off"
        enterKeyHint="done"
        value={value}
        maxLength={BILL_LIMITS.inputLength}
        placeholder={placeholder}
        aria-invalid={problem !== ""}
        aria-describedby={problem ? `${hintId} ${problemId}` : hintId}
        onChange={(event) => {
          if (AMOUNT_CHARACTERS.test(event.target.value)) onChange(event.target.value);
        }}
        onKeyDown={evaluateOnKey}
        className={`${INPUT} mt-2 tabular-nums aria-invalid:border-error`}
      />
      {problem && (
        <FieldError id={problemId} role="alert">{problem}</FieldError>
      )}
      {!problem && preview && <p className="mt-2 text-body-sm text-text-muted tabular-nums">{preview}</p>}
      {shortcuts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {shortcuts.map((shortcut) => (
            <button
              key={shortcut.label}
              type="button"
              aria-pressed={value === shortcut.value}
              onClick={() => onChange(value === shortcut.value ? "" : shortcut.value)}
              className={choiceClass(value === shortcut.value)}
            >
              {shortcut.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
