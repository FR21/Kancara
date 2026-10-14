"use client";

import { CircleAlert } from "lucide-react";
import { type KeyboardEvent, useId } from "react";
import { FIELD_LABEL, INPUT, choiceClass } from "@/components/ui/styles";
import { AMOUNT_CHARACTERS } from "@/lib/split-bill/amount";
import { BILL_LIMITS } from "@/lib/split-bill/bill";

export type AmountShortcut = { label: string; value: string };

type AmountFieldProps = {
  label: string;
  /** Said after the label, such as "optional". */
  labelNote?: string;
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
  labelNote,
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
        {labelNote && <span className="font-medium text-text-muted"> ({labelNote})</span>}
      </label>
      <p id={hintId} className="mt-1 text-caption text-pretty text-text-muted">
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
        <p id={problemId} role="alert" className="mt-2 flex items-start gap-2 text-body-sm text-error">
          <CircleAlert className="mt-1 size-4 shrink-0" aria-hidden="true" />
          {problem}
        </p>
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
