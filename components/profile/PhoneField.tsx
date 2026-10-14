"use client";

import { INPUT } from "@/components/ui/styles";

type PhoneFieldProps = {
  /** The id of the number field, which is the one a label points at. */
  id: string;
  /** The calling code without the plus. */
  dial: string;
  national: string;
  dialLabel: string;
  placeholder: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onDialChange: (dial: string) => void;
  onNationalChange: (national: string) => void;
  onBlur?: () => void;
};

const MAX_DIAL_DIGITS = 4;
const MAX_NATIONAL_CHARS = 18;

// A phone number asked for as a calling code and the rest. The code is filled in from the country chosen beside
// it and stays editable, for someone whose number is from somewhere else.
export default function PhoneField({
  id,
  dial,
  national,
  dialLabel,
  placeholder,
  disabled,
  invalid,
  describedBy,
  onDialChange,
  onNationalChange,
  onBlur,
}: PhoneFieldProps) {
  // Both halves are marked invalid together, since either one can be what is wrong with the number. Both are the
  // same field, so the pair reads as one control: same height, same corners, same padding.
  const tone = `${INPUT} tabular-nums disabled:cursor-not-allowed aria-invalid:border-error`;
  return (
    <div className="flex gap-2">
      {/* The plus is part of what the field shows, so it needs no padding of its own; only the digits are kept. */}
      <div className="w-24 shrink-0">
        <input
          id={`${id}-dial`}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-country-code"
          aria-label={dialLabel}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          value={dial ? `+${dial}` : ""}
          placeholder="+62"
          onChange={(event) => onDialChange(event.target.value.replace(/\D/g, "").slice(0, MAX_DIAL_DIGITS))}
          onBlur={onBlur}
          className={tone}
        />
      </div>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        disabled={disabled}
        value={national}
        placeholder={placeholder}
        maxLength={MAX_NATIONAL_CHARS}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => onNationalChange(event.target.value.replace(/[^\d\s-]/g, ""))}
        onBlur={onBlur}
        className={`${tone} min-w-0 flex-1`}
      />
    </div>
  );
}
