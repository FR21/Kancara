"use client";

import { CalendarCheck, CircleAlert } from "lucide-react";
import { useState } from "react";
import type { Messages } from "@/lib/messages";
import { FIELD_LABEL, INPUT, PRIMARY_BUTTON } from "./styles";

type ChatDatePickerProps = {
  text: Messages["plan"];
  onPick: (startDate: string, endDate: string) => void;
};

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function ChatDatePicker({ text, onPick }: ChatDatePickerProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const today = todayIso();
  const reversed = startDate !== "" && endDate !== "" && endDate < startDate;
  const ready = startDate !== "" && endDate !== "" && !reversed;

  return (
    <fieldset className="w-full max-w-md rounded-2xl border border-border bg-surface p-4">
      <legend className="sr-only">{text.chat.datesLegend}</legend>
      <p aria-hidden="true" className="text-label text-text-muted">
        {text.chat.datesLegend}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="chat-start-date" className={FIELD_LABEL}>
            {text.pass.startDate}
          </label>
          <input
            id="chat-start-date"
            type="date"
            value={startDate}
            min={today}
            onChange={(event) => setStartDate(event.target.value)}
            className={`${INPUT} mt-2`}
          />
        </div>
        <div>
          <label htmlFor="chat-end-date" className={FIELD_LABEL}>
            {text.pass.endDate}
          </label>
          <input
            id="chat-end-date"
            type="date"
            value={endDate}
            min={startDate || today}
            aria-invalid={reversed}
            aria-describedby={reversed ? "chat-date-error" : undefined}
            onChange={(event) => setEndDate(event.target.value)}
            className={`${INPUT} mt-2 ${reversed ? "border-error" : ""}`}
          />
        </div>
      </div>
      {reversed && (
        <p
          id="chat-date-error"
          className="mt-2 flex items-center gap-2 text-body-sm text-error motion-safe:animate-message-in"
        >
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {text.pass.dateError}
        </p>
      )}
      <button
        type="button"
        disabled={!ready}
        onClick={() => onPick(startDate, endDate)}
        className={`${PRIMARY_BUTTON} mt-4 w-full`}
      >
        <CalendarCheck className="size-4" aria-hidden="true" />
        {text.chat.useDates}
      </button>
    </fieldset>
  );
}
