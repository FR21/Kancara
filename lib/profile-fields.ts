export const GENDERS = ["male", "female", "other", "preferNotToSay"] as const;

export const MAX_AGE = 120;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const NAME_MIN = 2;
const NAME_MAX = 50;

const USERNAME_PATTERN = /^@?[a-zA-Z0-9._]{3,20}$/;

/** A date as YYYY-MM-DD in the browser's or server's own calendar. */
function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// The account keeps the age worked out from the date, and the database holds an age of 1 to 120 only, so a date
// that makes someone younger than one year would be refused there and the whole save would fail.
const MIN_AGE = 1;

/** The earliest and latest dates of birth a person can have: MAX_AGE and MIN_AGE years ago. */
export function birthDateRange(today = new Date()): { min: string; max: string } {
  const earliest = new Date(today);
  earliest.setFullYear(today.getFullYear() - MAX_AGE);
  const latest = new Date(today);
  latest.setFullYear(today.getFullYear() - MIN_AGE);
  return { min: isoDay(earliest), max: isoDay(latest) };
}

export function isBirthDateValid(value: string, today = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) return false;
  const { min, max } = birthDateRange(today);
  return value >= min && value <= max;
}

/** Whole years from a date of birth to today. */
export function ageFrom(birthDate: string, today = new Date()): number {
  const [year, month, day] = birthDate.split("-").map(Number);
  const birthdayPassed = today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  return today.getFullYear() - year - (birthdayPassed ? 0 : 1);
}

export function isUsernameValid(username: string): boolean {
  const trimmed = username.trim();
  return trimmed === "" || USERNAME_PATTERN.test(trimmed);
}

export function isNameValid(name: string): boolean {
  const length = name.trim().length;
  return length >= NAME_MIN && length <= NAME_MAX;
}
