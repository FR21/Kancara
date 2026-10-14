import SelectField from "@/components/ui/SelectField";
import type { Messages } from "@/lib/messages";
import { GENDERS } from "@/lib/profile-fields";

type GenderSelectProps = {
  id: string;
  value: string;
  options: Messages["profile"]["genderOptions"];
  disabled?: boolean;
  onChange: (value: string) => void;
};

export default function GenderSelect({ id, value, options, disabled, onChange }: GenderSelectProps) {
  return (
    <SelectField id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        <option value="">{options.none}</option>
        {GENDERS.map((gender) => (
          <option key={gender} value={gender}>
            {options[gender]}
          </option>
        ))}
    </SelectField>
  );
}
