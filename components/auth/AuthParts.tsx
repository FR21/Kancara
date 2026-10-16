import { Check, Circle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from "@/components/ui/styles";
import { PASSWORD_RULES, type PasswordRule, passwordRuleMet } from "@/lib/auth/validation";
import ErrorAlert from "@/components/ui/ErrorAlert";

/** The form's own problem (not one field's), in the app's one error box. */
export function FormAlert({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="motion-safe:animate-message-in">
      <ErrorAlert message={message} />
    </div>
  );
}

type SubmitButtonProps = {
  pending: boolean;
  children: ReactNode;
  className?: string;
};

export function SubmitButton({ pending, children, className = "w-full" }: SubmitButtonProps) {
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${PRIMARY_BUTTON} ${className}`}>
      {pending && <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-label text-text-muted">
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      {label}
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  );
}

type GoogleButtonProps = {
  label: string;
  disabled: boolean;
  onClick: () => void;
};

export function GoogleButton({ label, disabled, onClick }: GoogleButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${OUTLINE_BUTTON} w-full`}>
      <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      {label}
    </button>
  );
}

type PasswordRulesProps = {
  id: string;
  password: string;
  legend: string;
  labels: Record<PasswordRule, string>;
};

export function PasswordRules({ id, password, legend, labels }: PasswordRulesProps) {
  return (
    <div id={id} className="mt-3">
      <p className="text-body-sm text-text-muted">{legend}</p>
      <ul className="mt-2 flex flex-col gap-1">
        {PASSWORD_RULES.map((rule) => {
          const met = passwordRuleMet(rule, password);
          return (
            <li
              key={rule}
              className={`flex items-center gap-2 text-body-sm transition-colors duration-150 ease-out ${
                met ? "text-success" : "text-text-muted"
              }`}
            >
              {met ? (
                <Check className="size-4 shrink-0 motion-safe:animate-stamp-in" aria-hidden="true" />
              ) : (
                <Circle className="size-4 shrink-0" aria-hidden="true" />
              )}
              {labels[rule]}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
