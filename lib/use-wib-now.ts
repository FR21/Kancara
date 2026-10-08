import { useSyncExternalStore } from "react";

const TICK_MS = 20_000;
const FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export type WibNow = { date: string; time: string };

// "2026-10-08 21:15": a string so the snapshot stays identical within one minute.
function readNow(): string {
  const parts = new Map(FORMAT.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")} ${parts.get("hour")}:${parts.get("minute")}`;
}

function subscribe(notify: () => void) {
  const timer = setInterval(notify, TICK_MS);
  return () => clearInterval(timer);
}

const subscribeToNothing = () => () => {};

/** The current date and time in WIB, refreshed as minutes pass. Null when not enabled or while rendering on the server. */
export function useWibNow(enabled: boolean): WibNow | null {
  const now = useSyncExternalStore(
    enabled ? subscribe : subscribeToNothing,
    () => (enabled ? readNow() : ""),
    () => "",
  );
  if (now === "") return null;
  const [date, time] = now.split(" ");
  return { date, time };
}
