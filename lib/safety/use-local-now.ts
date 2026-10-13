import { useSyncExternalStore } from "react";

const TICK_MS = 20_000;
const pad = (value: number) => String(value).padStart(2, "0");

/** "2026-10-13 14:05" on this phone's own clock: a string, so the snapshot holds still within a minute. */
export function readLocalNow(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function subscribe(notify: () => void) {
  const timer = setInterval(notify, TICK_MS);
  return () => clearInterval(timer);
}

/**
 * The date and time where the phone is, refreshed as minutes pass. A plan's times are local to the place being
 * visited, and so is the phone's clock once the group is there, so this is the clock the plan is read against.
 * Null while rendering on the server.
 */
export function useLocalNow(): { date: string; time: string } | null {
  const now = useSyncExternalStore(subscribe, readLocalNow, () => "");
  if (now === "") return null;
  const [date, time] = now.split(" ");
  return { date, time };
}
