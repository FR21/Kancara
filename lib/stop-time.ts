const TIME_RANGE = /^\s*(\d{1,2}[:.]\d{2})\s*(?:[-–—]|to|sampai)\s*(\d{1,2}[:.]\d{2})\s*$/i;
const CLOCK = /^(\d{1,2})[:.](\d{2})$/;

// The planner writes times as free text, usually "09:00 - 12:00". Anything
// else is shown as it came.
export function splitTime(time: string): { start: string; end: string } {
  const match = TIME_RANGE.exec(time);
  return match ? { start: match[1], end: match[2] } : { start: time.trim(), end: "" };
}

/** Minutes since midnight for "09:30", or null when the text is not a clock time. */
export function toMinutes(clock: string): number | null {
  const match = CLOCK.exec(clock.trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}
