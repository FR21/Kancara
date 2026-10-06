export const GENDERS = ["male", "female", "other", "preferNotToSay"] as const;

export const MAX_AGE = 120;
const NAME_MIN = 2;
const NAME_MAX = 50;

const USERNAME_PATTERN = /^@?[a-zA-Z0-9._]{3,20}$/;

export function isAgeValid(age: string): boolean {
  if (age === "") return true;
  const years = Number(age);
  return Number.isInteger(years) && years >= 1 && years <= MAX_AGE;
}

export function isUsernameValid(username: string): boolean {
  const trimmed = username.trim();
  return trimmed === "" || USERNAME_PATTERN.test(trimmed);
}

export function isNameValid(name: string): boolean {
  const length = name.trim().length;
  return length >= NAME_MIN && length <= NAME_MAX;
}
