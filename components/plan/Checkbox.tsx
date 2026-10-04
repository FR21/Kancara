import { Check } from "lucide-react";

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export default function Checkbox({ checked, onChange }: CheckboxProps) {
  return (
    <span className="relative flex size-6 shrink-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer size-full cursor-pointer appearance-none rounded-md border-2 border-border-strong bg-background transition-[background-color,border-color] duration-150 ease-out checked:border-primary checked:bg-primary"
      />
      <Check
        aria-hidden="true"
        strokeWidth={3.5}
        className="pointer-events-none absolute inset-0 m-auto size-4 text-on-primary opacity-0 transition-opacity duration-150 ease-out peer-checked:opacity-100"
      />
    </span>
  );
}
