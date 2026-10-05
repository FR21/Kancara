const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_MIN = 8;

export const PASSWORD_RULES = ["length", "case", "number"] as const;
export type PasswordRule = (typeof PASSWORD_RULES)[number];

const RULE_CHECKS: Record<PasswordRule, (password: string) => boolean> = {
  length: (password) => password.length >= PASSWORD_MIN,
  case: (password) => /[a-z]/.test(password) && /[A-Z]/.test(password),
  number: (password) => /\d/.test(password),
};

export function passwordRuleMet(rule: PasswordRule, password: string): boolean {
  return RULE_CHECKS[rule](password);
}

export function isPasswordStrong(password: string): boolean {
  return PASSWORD_RULES.every((rule) => passwordRuleMet(rule, password));
}

export function emailIssue(email: string): "required" | "invalidEmail" | null {
  const trimmed = email.trim();
  if (trimmed === "") return "required";
  if (!EMAIL_PATTERN.test(trimmed)) return "invalidEmail";
  return null;
}
