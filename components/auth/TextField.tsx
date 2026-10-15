"use client";

import { Eye, EyeOff } from "lucide-react";
import { type InputHTMLAttributes, type ReactNode, useState } from "react";
import RequiredMark from "@/components/ui/RequiredMark";
import { FIELD_LABEL, INPUT } from "@/components/ui/styles";

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  error?: string;
  /** Marks the label with * and tells the browser and assistive technology the field must be filled. */
  required?: boolean;
  aside?: ReactNode;
  describedBy?: string;
  reveal?: { show: string; hide: string };
  onChange: (value: string) => void;
} & Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "placeholder" | "autoComplete" | "inputMode" | "disabled" | "onBlur" | "min" | "max"
>;

/** A field's label, which takes the primary colour while the field inside its `group` has the focus. */
export const FOCUS_FIELD_LABEL = `${FIELD_LABEL} transition-colors duration-150 ease-out group-focus-within:text-primary`;

export default function TextField({
  id,
  label,
  value,
  error,
  required = false,
  aside,
  describedBy,
  reveal,
  type = "text",
  onChange,
  ...input
}: TextFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const RevealIcon = revealed ? EyeOff : Eye;
  const errorId = `${id}-error`;
  const descriptions = [error ? errorId : null, describedBy ?? null].filter(Boolean).join(" ");

  return (
    <div className="group">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={FOCUS_FIELD_LABEL}>
          {label}
          {required && <RequiredMark />}
        </label>
        {aside}
      </div>
      <div className="relative">
        <input
          {...input}
          id={id}
          type={reveal && revealed ? "text" : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptions || undefined}
          className={`${INPUT} disabled:cursor-not-allowed aria-invalid:border-error ${reveal ? "pr-12" : ""}`}
        />
        {reveal && (
          <button
            type="button"
            onClick={() => setRevealed((shown) => !shown)}
            aria-label={revealed ? reveal.hide : reveal.show}
            aria-pressed={revealed}
            className="absolute top-0 right-0 inline-flex size-12 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-[color,scale] duration-150 ease-out hover:text-text active:scale-[0.97]"
          >
            <RevealIcon className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-2 text-body-sm text-error motion-safe:animate-message-in">
          {error}
        </p>
      )}
    </div>
  );
}
