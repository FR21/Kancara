import type { LucideIcon } from "lucide-react";
import { EASE } from "@/components/ui/styles";

type SegmentedToggleProps<Value extends string> = {
  name: string;
  /** Names the choice for assistive technology. */
  label: string;
  options: readonly Value[];
  labels: Record<Value, string>;
  value: Value;
  onChange: (value: Value) => void;
  icons?: Partial<Record<Value, LucideIcon>>;
  /** Spans its container on a phone, then shrinks to its options from 640px. */
  block?: boolean;
  className?: string;
};

// A choice between a few options, drawn as one pill with a thumb that slides to the picked one. The one control
// for picking a view or a level anywhere in Kancara; tabs that switch a panel (TripTabs) are drawn the same way.
export default function SegmentedToggle<Value extends string>({
  name,
  label,
  options,
  labels,
  value,
  onChange,
  icons,
  block = false,
  className = "",
}: SegmentedToggleProps<Value>) {
  const picked = Math.max(options.indexOf(value), 0);
  const width = block ? "w-full sm:w-fit" : "w-fit";
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`relative grid auto-cols-fr grid-flow-col rounded-full border border-border-strong bg-surface p-1 ${width} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-1 left-1 rounded-full bg-primary transition-[translate] duration-200 ${EASE} motion-reduce:transition-none`}
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, translate: `${picked * 100}% 0` }}
      />
      {options.map((option) => {
        const Icon: LucideIcon | undefined = icons?.[option];
        return (
          <label key={option} title={labels[option]} className="relative min-w-0 cursor-pointer">
            <input
              type="radio"
              name={name}
              checked={value === option}
              onChange={() => onChange(option)}
              className="peer sr-only"
            />
            <span className="flex h-9 min-w-0 max-w-full items-center justify-center gap-1.5 rounded-full px-2 text-caption font-medium text-text-muted transition-colors duration-150 ease-out peer-checked:text-on-primary peer-hover:text-text peer-checked:peer-hover:text-on-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary sm:gap-2 sm:px-4 sm:text-label">
              {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
              <span className="min-w-0 truncate">{labels[option]}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
