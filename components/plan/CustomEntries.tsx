"use client";

import { Plus, X } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import type { Messages } from "@/lib/messages";
import { fillTemplate, MAX_CUSTOM_CHARS, MAX_CUSTOM_ENTRIES } from "@/lib/plan-draft";
import { INPUT } from "./styles";

type CustomChipProps = {
  label: string;
  text: Messages["plan"]["custom"];
  onRemove: () => void;
};

type CustomAddProps = {
  id: string;
  label: string;
  placeholder: string;
  count: number;
  text: Messages["plan"]["custom"];
  onAdd: (value: string) => void;
};

/** An entry typed by hand. It sits among the choices as a picked one, and tapping it removes it. */
export function CustomChip({ label, text, onRemove }: CustomChipProps) {
  const removeLabel = fillTemplate(text.remove, { name: label });
  return (
    <button
      type="button"
      aria-label={removeLabel}
      title={removeLabel}
      onClick={onRemove}
      className="inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-3xl border border-primary bg-primary py-2 pr-3 pl-4 text-left text-label text-on-primary transition-[background-color,scale] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97] motion-safe:animate-message-in"
    >
      <span className="min-w-0 wrap-anywhere">{label}</span>
      <X className="size-4 shrink-0" aria-hidden="true" />
    </button>
  );
}

// The way out of a fixed list: whatever is not among the choices is typed here.
export default function CustomAdd({ id, label, placeholder, count, text, onAdd }: CustomAddProps) {
  const [pending, setPending] = useState("");

  const add = () => {
    if (pending.trim() === "") return;
    onAdd(pending);
    setPending("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter that confirms a word in an input method (Japanese, Chinese, Korean) is not an answer yet.
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    add();
  };

  if (count >= MAX_CUSTOM_ENTRIES) {
    return <p className="text-body-sm text-text-muted">{fillTemplate(text.full, { count })}</p>;
  }

  return (
    <div>
      <label htmlFor={id} className="block text-caption font-bold text-text-muted">
        {label}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          type="text"
          autoComplete="off"
          maxLength={MAX_CUSTOM_CHARS}
          value={pending}
          placeholder={placeholder}
          onChange={(event) => setPending(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={add}
          className={`${INPUT} min-w-0`}
        />
        <button
          type="button"
          disabled={pending.trim() === ""}
          onClick={add}
          className="inline-flex h-12 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-border-strong px-4 text-label text-text transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden="true" />
          {text.add}
        </button>
      </div>
    </div>
  );
}
