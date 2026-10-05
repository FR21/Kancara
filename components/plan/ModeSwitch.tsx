"use client";

import { ListChecks, MessageCircle } from "lucide-react";
import type { Messages } from "@/lib/messages";
import type { PlanMode } from "./flow";
import { EASE } from "./styles";

type ModeSwitchProps = {
  mode: PlanMode;
  text: Messages["plan"]["mode"];
  onChange: (mode: PlanMode) => void;
};

const OPTIONS = [
  { mode: "captain", Icon: MessageCircle },
  { mode: "manual", Icon: ListChecks },
] as const;

export default function ModeSwitch({ mode, text, onChange }: ModeSwitchProps) {
  return (
    <div
      role="group"
      aria-label={text.label}
      className="relative grid w-full grid-cols-2 rounded-full border border-border-strong bg-surface p-1 sm:inline-grid sm:w-auto"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary transition-[translate] duration-200 ${EASE} motion-reduce:transition-none ${
          mode === "manual" ? "translate-x-full" : ""
        }`}
      />
      {OPTIONS.map(({ mode: option, Icon }) => (
        <button
          key={option}
          type="button"
          aria-pressed={mode === option}
          onClick={() => onChange(option)}
          className={`relative inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-label whitespace-nowrap transition-[color,scale] duration-150 ease-out active:scale-[0.97] ${
            mode === option ? "text-on-primary" : "text-text-muted hover:text-text"
          }`}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {text[option]}
        </button>
      ))}
    </div>
  );
}
