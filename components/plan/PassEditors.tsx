"use client";

import { Check, CircleAlert, Plus } from "lucide-react";
import { type Dispatch, type KeyboardEvent, useEffect, useState } from "react";
import { type Currency, CURRENCIES, idrToUsd, usdToIdr } from "@/lib/currency";
import type { Messages } from "@/lib/messages";
import {
  type PlanDraft,
  type PlanDraftAction,
  fillTemplate,
  hasDateError,
  PACES,
  parseLocalDate,
} from "@/lib/plan-draft";
import { useExchangeRate } from "@/lib/use-exchange-rate";
import { useLocale } from "@/lib/use-locale";
import Checkbox from "@/components/ui/Checkbox";
import SegmentedToggle from "@/components/ui/SegmentedToggle";
import { FIELD_LABEL, INPUT, INPUT_BUTTON, choiceClass } from "@/components/ui/styles";
import { CustomChip } from "./CustomAdd";

type EditorProps = {
  draft: PlanDraft;
  dispatch: Dispatch<PlanDraftAction>;
  text: Messages["plan"];
};

const BUDGET_PRESETS: Record<Currency, number[]> = { IDR: [2_000_000, 5_000_000, 10_000_000], USD: [150, 300, 600] };
const MAX_BUDGET_DIGITS: Record<Currency, number> = { IDR: 13, USD: 9 };
const MINUTE_MS = 60_000;

function todayIso(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * MINUTE_MS).toISOString().slice(0, 10);
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
        className={`${INPUT} mt-2`}
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
          className={`${INPUT} min-w-0`}
        />
        <button type="button" disabled={pendingCity.trim() === ""} onClick={addCity} className={INPUT_BUTTON}>
          <Plus className="size-4" aria-hidden="true" />
          {text.pass.addDestination}
        </button>
      </div>
      {draft.destinations.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {draft.destinations.map((city, index) => (
            <li key={city} className="max-w-full">
              <CustomChip
                label={city}
                removeLabel={fillTemplate(text.pass.removeDestination, { name: city })}
                onRemove={() => dispatch({ type: "removeDestination", index })}
              />
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
            className={`${INPUT} mt-2`}
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
            className={`${INPUT} mt-2 ${dateError ? "border-error" : ""}`}
          />
        </div>
      </div>
      {dateError && (
        <p id="pass-date-error" className="mt-2 flex items-center gap-2 text-body-sm text-error">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {text.pass.dateError}
        </p>
      )}
      <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-body-sm text-text">
        <Checkbox
          checked={draft.extras.flexibleDates}
          onChange={(value) => dispatch({ type: "setFlexibleDates", value })}
        />
        {text.pass.flexibleDates}
      </label>
    </div>
  );
}

export function BudgetEditor({ draft, dispatch, text }: EditorProps) {
  const locale = useLocale();
  const rate = useExchangeRate();
  const copy = text.budget;
  const currency = draft.budgetCurrency;
  // The Rupiah amount is what the plan runs on. Dollars are shown as typed, or worked out from the Rupiah.
  const amounts: Record<Currency, number | null> = {
    IDR: draft.budget,
    USD: draft.budgetUsd ?? (draft.budget === null ? null : idrToUsd(draft.budget, rate)),
  };

  const grouped = new Intl.NumberFormat(locale);
  const money = (unit: Currency, compact = false) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: unit,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : 0,
    });
  const rateValues = { one: money("USD").format(1), rate: money("IDR").format(rate.idrPerUsd) };
  const rateLine = rate.date
    ? fillTemplate(copy.rate, {
        ...rateValues,
        date: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(
          parseLocalDate(rate.date),
        ),
      })
    : fillTemplate(copy.rateEstimate, rateValues);

  // Dollars someone typed stay as typed; their Rupiah value follows the rate in use.
  useEffect(() => {
    if (draft.budgetUsd === null) return;
    const idr = usdToIdr(draft.budgetUsd, rate);
    if (idr !== draft.budget) dispatch({ type: "setBudgetUsd", usd: draft.budgetUsd, idr });
  }, [draft.budget, draft.budgetUsd, rate, dispatch]);

  const setAmount = (value: number | null) => {
    if (currency === "IDR") dispatch({ type: "setBudget", value });
    else dispatch({ type: "setBudgetUsd", usd: value, idr: value === null ? null : usdToIdr(value, rate) });
  };

  const handleChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, MAX_BUDGET_DIGITS[currency]);
    setAmount(digits ? Number(digits) : null);
  };

  const otherCurrency: Currency = currency === "IDR" ? "USD" : "IDR";
  const otherAmount = amounts[otherCurrency];
  const convertedText =
    otherAmount !== null
      ? `≈ ${money(otherCurrency).format(otherAmount)}`
      : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor={`pass-budget-${currency}`} className={FIELD_LABEL}>
          {copy.fields[currency]}
        </label>
        <SegmentedToggle
          name="budget-currency"
          label={copy.currencyLegend}
          options={CURRENCIES}
          labels={copy.currencies}
          value={currency}
          block
          onChange={(value) => dispatch({ type: "setBudgetCurrency", value })}
        />
      </div>

      <div>
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-label font-bold text-text-muted"
          >
            {currency === "IDR" ? "Rp" : "$"}
          </span>
          <input
            id={`pass-budget-${currency}`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={amounts[currency] ?? ""}
            placeholder={copy.placeholders[currency].replace(/^(Example:\s*|Contoh:\s*)/i, "")}
            onChange={(event) => handleChange(event.target.value)}
            className={`${INPUT} pl-12 text-body-lg font-semibold tabular-nums`}
          />
        </div>

        {convertedText && (
          <p className="mt-2 text-caption text-text-muted">
            <span className="font-medium text-text">{convertedText}</span>
            <span className="ml-1.5 opacity-80">({copy.auto})</span>
          </p>
        )}
      </div>

      <div role="group" aria-label={copy.quick} className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-caption font-bold text-text-muted">{copy.quick}</span>
        {BUDGET_PRESETS[currency].map((preset) => {
          const selected = amounts[currency] === preset;
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={selected}
              onClick={() => setAmount(preset)}
              className={choiceClass(selected)}
            >
              {money(currency, true).format(preset)}
            </button>
          );
        })}
      </div>

      <p className="pt-2 text-caption text-text-muted">{rateLine}</p>
    </div>
  );
}

export function PaceEditor({ draft, dispatch, text }: EditorProps) {
  return (
    <fieldset className="min-w-0">
      <legend className={FIELD_LABEL}>{text.pass.pace}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {PACES.map((pace) => {
          const selected = draft.pace === pace;
          return (
            <button
              key={pace}
              type="button"
              aria-pressed={selected}
              onClick={() => dispatch({ type: "setPace", value: pace })}
              className={choiceClass(selected)}
            >
              {selected && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
              {text.paces[pace]}
            </button>
          );
        })}
      </div>
      {draft.pace && (
        <p className="mt-2 text-caption text-pretty text-text-muted">
          {text.paceHints[draft.pace]}
        </p>
      )}
    </fieldset>
  );
}
