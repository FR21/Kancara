"use client";

import { Eye, EyeOff } from "lucide-react";
import { type InputHTMLAttributes, type ReactNode, useState } from "react";
import { INPUT } from "@/components/plan/styles";

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  error?: string;
  optionalLabel?: string;
  aside?: ReactNode;
  describedBy?: string;
  reveal?: { show: string; hide: string };
  onChange: (value: string) => void;
} & Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "placeholder" | "autoComplete" | "inputMode" | "disabled" | "onBlur" | "min" | "max"
>;

export const FIELD_LABEL =
  "text-label text-text transition-colors duration-150 ease-out group-focus-within:text-primary";

export function OptionalMark({ label }: { label: string }) {
  return <span className="ml-1 font-normal text-text-muted">({label})</span>;
}

export default function TextField({
  id,
  label,
  value,
  error,
  optionalLabel,
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
        <label htmlFor={id} className={FIELD_LABEL}>
          {label}
          {optionalLabel && <OptionalMark label={optionalLabel} />}
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
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptions || undefined}
          className={`${INPUT} disabled:cursor-not-allowed ${reveal ? "pr-12" : ""} ${error ? "border-error" : ""}`}
        />
        {reveal && (
          <button
            type="button"
            onClick={() => setRevealed((shown) => !shown)}
            aria-label={revealed ? reveal.hide : reveal.show}
            aria-pressed={revealed}
            className="absolute top-0.5 right-0.5 inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-[color,scale] duration-150 ease-out hover:text-text active:scale-[0.97]"
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
