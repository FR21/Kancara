import { ChevronDown } from "lucide-react";
import { INPUT } from "@/components/plan/styles";
import type { Messages } from "@/lib/messages";
import { GENDERS } from "@/lib/profile-fields";

type GenderSelectProps = {
  id: string;
  value: string;
  options: Messages["profile"]["genderOptions"];
  disabled?: boolean;
  className?: string;
  onChange: (value: string) => void;
};

export default function GenderSelect({ id, value, options, disabled, className = "", onChange }: GenderSelectProps) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`${INPUT} cursor-pointer appearance-none pr-12 disabled:cursor-not-allowed ${className}`}
      >
        <option value="">{options.none}</option>
        {GENDERS.map((gender) => (
          <option key={gender} value={gender}>
            {options[gender]}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-text-muted"
      />
    </div>
  );
}
