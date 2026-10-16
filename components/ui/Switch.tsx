import type { ReactNode } from "react";
import { EASE } from "@/components/ui/styles";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
};

// An on/off setting, drawn the way phones draw them: a small track with a knob that slides, and its words beside
// it. The whole row is the 44px target; the track itself stays small, so a setting never shouts like a button.
export default function Switch({ checked, onChange, children }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-full text-left text-body-sm text-text"
    >
      <span
        aria-hidden="true"
        className={`flex h-6 w-10 shrink-0 items-center rounded-full border-2 transition-[background-color,border-color] duration-200 ease-out ${
          checked ? "border-primary bg-primary" : "border-border-strong bg-surface-muted group-hover:border-text-muted"
        }`}
      >
        <span
          className={`size-4 rounded-full bg-background shadow-sm shadow-neutral-950/20 transition-[translate] duration-200 ${EASE} motion-reduce:transition-none ${
            checked ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </span>
      {children}
    </button>
  );
}
