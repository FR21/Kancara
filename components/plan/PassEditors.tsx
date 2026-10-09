"use client";

import { Check, CircleAlert, Plus, X } from "lucide-react";
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
import Checkbox from "./Checkbox";
import SegmentedToggle from "./SegmentedToggle";
import { FIELD_LABEL, INPUT } from "./styles";

type EditorProps = {
  draft: PlanDraft;
  dispatch: Dispatch<PlanDraftAction>;
  text: Messages["plan"];
};

type PickProps = EditorProps & { onPicked: () => void };

const BUDGET_PRESETS: Record<Currency, number[]> = { IDR: [5_000_000, 10_000_000, 30_000_000], USD: [300, 600, 2000] };
const MAX_BUDGET_DIGITS: Record<Currency, number> = { IDR: 13, USD: 9 };
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
        <p id="pass-date-error" className="mt-2 flex items-center gap-2 text-body-sm text-error">
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

  const pickPreset = (preset: number) => {
    setAmount(preset);
    onPicked();
  };

  return (
    <div>
      <SegmentedToggle
        name="budget-currency"
        label={copy.currencyLegend}
        options={CURRENCIES}
        labels={copy.currencies}
        value={currency}
        onChange={(value) => dispatch({ type: "setBudgetCurrency", value })}
      />

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {BUDGET_PRESETS[currency].map((preset) => {
          const selected = (currency === "IDR" ? draft.budget : draft.budgetUsd) === preset;
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={selected}
              onClick={() => pickPreset(preset)}
              className={`${bigChoiceClass(selected)} justify-center font-heading text-h3 font-extrabold tabular-nums`}
            >
              {money(currency, true).format(preset)}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {CURRENCIES.map((unit) => {
          const active = unit === currency;
          const amount = amounts[unit];
          // The field being typed in keeps plain digits; the worked-out one is grouped for reading.
          let shown: number | string = "";
          if (amount !== null) shown = active ? amount : grouped.format(amount);
          return (
            <div key={unit}>
              <label htmlFor={`pass-budget-${unit}`} className={`${FIELD_LABEL} block`}>
                {copy.fields[unit]}
              </label>
              <input
                id={`pass-budget-${unit}`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                disabled={!active}
                value={shown}
                placeholder={active ? copy.placeholders[unit] : copy.auto}
                aria-describedby="pass-budget-summary"
                onChange={(event) => handleChange(event.target.value)}
                className={`${BIG_INPUT} mt-2 tabular-nums disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-text-muted`}
              />
            </div>
          );
        })}
      </div>

      <p id="pass-budget-summary" aria-live="polite" className="mt-3 min-h-6 text-body-sm text-text tabular-nums">
        {amounts.IDR !== null && amounts.USD !== null
          ? `${money("IDR").format(amounts.IDR)} ≈ ${money("USD").format(amounts.USD)}`
          : ""}
      </p>
      <p className="mt-1 text-caption text-text-muted">{rateLine}</p>
    </div>
  );
}

export function PaceEditor({ draft, dispatch, text }: EditorProps) {
  return (
    <fieldset className="min-w-0">
      <legend className={FIELD_LABEL}>{text.pass.pace}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {PACES.map((pace) => {
          const selected = draft.pace === pace;
          return (
            <button
              key={pace}
              type="button"
              aria-pressed={selected}
              onClick={() => dispatch({ type: "setPace", value: pace })}
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
    </fieldset>
  );
}
