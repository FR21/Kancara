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
import { FIELD_LABEL, INPUT, INPUT_BUTTON, choiceCardClass, choiceClass } from "@/components/ui/styles";
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
                onChange={(event) => handleChange(event.target.value)}
                className={`${INPUT} mt-2 tabular-nums disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-text-muted`}
              />
            </div>
          );
        })}
      </div>

      <div role="group" aria-label={copy.quick} className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-caption font-bold text-text-muted">{copy.quick}</span>
        {BUDGET_PRESETS[currency].map((preset) => {
          const selected = amounts[currency] === preset;
          return (
            <button key={preset} type="button" aria-pressed={selected} onClick={() => setAmount(preset)} className={choiceClass(selected)}>
              {money(currency, true).format(preset)}
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-caption text-text-muted">{rateLine}</p>
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
              className={choiceCardClass(selected)}
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
