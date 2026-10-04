"use client";

import { Check, CircleAlert, Plus, X } from "lucide-react";
import { type Dispatch, type KeyboardEvent, useState } from "react";
import type { Messages } from "@/lib/messages";
import { type PlanDraft, type PlanDraftAction, fillTemplate, hasDateError, PACES } from "@/lib/plan-draft";
import { useLocale } from "@/lib/use-locale";
import Checkbox from "./Checkbox";
import { FIELD_LABEL, INPUT } from "./styles";

type EditorProps = {
  draft: PlanDraft;
  dispatch: Dispatch<PlanDraftAction>;
  text: Messages["plan"];
};

type PickProps = EditorProps & { onPicked: () => void };

const BUDGET_PRESETS = [5_000_000, 10_000_000, 30_000_000];
const MINUTE_MS = 60_000;

function todayIso(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * MINUTE_MS).toISOString().slice(0, 10);
}
const BIG_INPUT = `${INPUT} h-14 text-body`;
const BIG_CHOICE =
  "flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-2xl border px-5 py-3 text-left transition-[background-color,border-color,color,scale] duration-150 ease-out active:scale-[0.98]";

function bigChoiceClass(selected: boolean): string {
  const tone = selected
    ? "border-primary bg-primary text-on-primary"
    : "border-border-strong bg-surface text-text hover:border-primary hover:bg-primary-subtle";
  return `${BIG_CHOICE} ${tone}`;
}

export function OriginEditor({ draft, dispatch, text }: EditorProps) {
  return (
    <div>
      <label htmlFor="pass-origin" className={FIELD_LABEL}>
        {text.pass.origin}
      </label>
      <input
        id="pass-origin"
        type="text"
        autoComplete="off"
        value={draft.origin}
        placeholder={text.pass.originPlaceholder}
        onChange={(event) => dispatch({ type: "setOrigin", value: event.target.value })}
        className={`${BIG_INPUT} mt-2`}
      />
    </div>
  );
}

export function DestinationsEditor({ draft, dispatch, text }: EditorProps) {
  const [pendingCity, setPendingCity] = useState("");

  const addCity = () => {
    if (pendingCity.trim() === "") return;
    dispatch({ type: "addDestination", value: pendingCity });
    setPendingCity("");
  };

  const handleCityKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addCity();
  };

  return (
    <div>
      <label htmlFor="pass-destination" className={FIELD_LABEL}>
        {text.pass.destinations}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="pass-destination"
          type="text"
          autoComplete="off"
          value={pendingCity}
          placeholder={text.pass.destinationPlaceholder}
          onChange={(event) => setPendingCity(event.target.value)}
          onKeyDown={handleCityKeyDown}
          onBlur={addCity}
          className={`${BIG_INPUT} min-w-0`}
        />
        <button
          type="button"
          disabled={pendingCity.trim() === ""}
          onClick={addCity}
          className="inline-flex h-14 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-border-strong px-4 text-label text-text transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden="true" />
          {text.pass.addDestination}
        </button>
      </div>
      {draft.destinations.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {draft.destinations.map((city, index) => (
            <li
              key={city}
              className="flex items-center gap-1 rounded-full bg-primary-subtle py-1 pr-1 pl-4 text-label-lg text-on-primary-subtle motion-safe:animate-message-in"
            >
              {city}
              <button
                type="button"
                aria-label={fillTemplate(text.pass.removeDestination, { name: city })}
                onClick={() => dispatch({ type: "removeDestination", index })}
                className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full transition-[background-color,scale] duration-150 ease-out hover:bg-primary/15 active:scale-[0.95]"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DatesEditor({ draft, dispatch, text }: EditorProps) {
  const dateError = hasDateError(draft);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pass-start" className={FIELD_LABEL}>
            {text.pass.startDate}
          </label>
          <input
            id="pass-start"
            type="date"
            value={draft.startDate}
            min={todayIso()}
            onChange={(event) => dispatch({ type: "setDate", field: "startDate", value: event.target.value })}
            className={`${BIG_INPUT} mt-2`}
          />
        </div>
        <div>
          <label htmlFor="pass-end" className={FIELD_LABEL}>
            {text.pass.endDate}
          </label>
          <input
            id="pass-end"
            type="date"
            value={draft.endDate}
            min={draft.startDate || todayIso()}
            aria-invalid={dateError}
            aria-describedby={dateError ? "pass-date-error" : undefined}
            onChange={(event) => dispatch({ type: "setDate", field: "endDate", value: event.target.value })}
            className={`${BIG_INPUT} mt-2 ${dateError ? "border-error" : ""}`}
          />
        </div>
      </div>
      {dateError && (
        <p id="pass-date-error" className="mt-2 flex items-center gap-1.5 text-body-sm text-error">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {text.pass.dateError}
        </p>
      )}
      <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-body-sm text-text">
        <Checkbox
          checked={draft.extras.flexibleDates}
          onChange={(value) => dispatch({ type: "setFlexibleDates", value })}
        />
        {text.pass.flexibleDates}
      </label>
    </div>
  );
}

export function BudgetEditor({ draft, dispatch, text, onPicked }: PickProps) {
  const locale = useLocale();
  const fullFormat = new Intl.NumberFormat(locale, { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
  const compactFormat = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    maximumFractionDigits: 1,
  });

  const handleChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    dispatch({ type: "setBudget", value: digits ? Number(digits) : null });
  };

  const pickPreset = (preset: number) => {
    dispatch({ type: "setBudget", value: preset });
    onPicked();
  };

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-3">
        {BUDGET_PRESETS.map((preset) => {
          const selected = draft.budget === preset;
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={selected}
              onClick={() => pickPreset(preset)}
              className={`${bigChoiceClass(selected)} justify-center font-heading text-h3 font-extrabold tabular-nums`}
            >
              {compactFormat.format(preset)}
            </button>
          );
        })}
      </div>

      <label htmlFor="pass-budget" className={`${FIELD_LABEL} mt-6 block`}>
        {text.budgetOther}
      </label>
      <input
        id="pass-budget"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={draft.budget ?? ""}
        placeholder={text.pass.budgetPlaceholder}
        aria-describedby="pass-budget-preview"
        onChange={(event) => handleChange(event.target.value)}
        className={`${BIG_INPUT} mt-2 tabular-nums`}
      />
      <p id="pass-budget-preview" aria-live="polite" className="mt-2 min-h-6 text-body-sm text-text-muted tabular-nums">
        {draft.budget ? fullFormat.format(draft.budget) : ""}
      </p>
    </div>
  );
}

export function PaceEditor({ draft, dispatch, text, onPicked }: PickProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {PACES.map((pace) => {
        const selected = draft.pace === pace;
        return (
          <button
            key={pace}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              dispatch({ type: "setPace", value: pace });
              onPicked();
            }}
            className={bigChoiceClass(selected)}
          >
            <span className="min-w-0 flex-1">
              <span className="block font-heading text-h3 font-extrabold">{text.paces[pace]}</span>
              <span className={`mt-1 block text-body-sm ${selected ? "text-on-primary" : "text-text-muted"}`}>
                {text.paceHints[pace]}
              </span>
            </span>
            {selected && <Check className="size-5 shrink-0" strokeWidth={3} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
