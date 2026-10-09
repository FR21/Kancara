import { EASE } from "./styles";

type SegmentedToggleProps<Value extends string> = {
  name: string;
  /** Names the pair for assistive technology. */
  label: string;
  options: readonly [Value, Value];
  labels: Record<Value, string>;
  value: Value;
  onChange: (value: Value) => void;
  className?: string;
};

// A choice between exactly two options, drawn as one pill with a thumb that slides to the picked side.
export default function SegmentedToggle<Value extends string>({
  name,
  label,
  options,
  labels,
  value,
  onChange,
  className = "",
}: SegmentedToggleProps<Value>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`relative grid w-fit grid-cols-2 rounded-full border border-border-strong p-1 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary transition-[translate] duration-200 ${EASE} motion-reduce:transition-none ${
          value === options[1] ? "translate-x-full" : ""
        }`}
      />
      {options.map((option) => (
        <label key={option} className="relative cursor-pointer">
          <input
            type="radio"
            name={name}
            checked={value === option}
            onChange={() => onChange(option)}
            className="peer sr-only"
          />
          <span className="flex h-11 items-center justify-center rounded-full px-4 text-label text-text-muted transition-colors duration-150 ease-out peer-checked:text-on-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
            {labels[option]}
          </span>
        </label>
      ))}
    </div>
  );
}
