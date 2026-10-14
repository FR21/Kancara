"use client";

import { sendPasswordResetEmail } from "firebase/auth";
import { ArrowLeft, CircleCheck } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import AuthHeading from "@/components/auth/AuthHeading";
import { FormAlert, SubmitButton } from "@/components/auth/AuthParts";
import TextField from "@/components/auth/TextField";
import { TEXT_LINK } from "@/components/ui/styles";
import { authErrorCode, authErrorKey } from "@/lib/auth/client";
import { emailIssue } from "@/lib/auth/validation";
import { auth } from "@/lib/firebase/client";
import { useMessages } from "@/lib/use-messages";

const UNKNOWN_ACCOUNT = "auth/user-not-found";

export default function ForgotPasswordPage() {
  const t = useMessages("auth");

  const [email, setEmail] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const emailKey = emailIssue(email);
  const emailError = attempted && emailKey ? t.errors[emailKey] : "";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (emailKey) {
      document.getElementById("forgot-email")?.focus();
      return;
    }

    setPending(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (caught) {
      const code = authErrorCode(caught);
      if (code === UNKNOWN_ACCOUNT) {
        setSent(true);
        return;
      }
      console.error("Password reset failed:", code);
      setError(t.errors[authErrorKey(caught) ?? "default"]);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="motion-safe:animate-message-in">
      <AuthHeading title={t.forgot.title} subtitle={t.forgot.subtitle} />

      {sent ? (
        <div
          role="status"
          className="mt-8 flex items-center gap-3 rounded-lg bg-success-subtle px-4 py-3 motion-safe:animate-message-in"
        >
          <CircleCheck className="size-6 shrink-0 text-success motion-safe:animate-stamp-in" aria-hidden="true" />
          <p className="text-body text-on-success-subtle">{t.forgot.success}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4">
          <FormAlert message={error} />
          <TextField
            id="forgot-email"
            type="email"
            label={t.forgot.emailLabel}
            placeholder={t.forgot.emailPlaceholder}
            autoComplete="email"
            inputMode="email"
            value={email}
            error={emailError}
            disabled={pending}
            onChange={setEmail}
          />
          <SubmitButton pending={pending} className="mt-2 w-full">
            {t.forgot.submit}
          </SubmitButton>
        </form>
      )}

      <p className="mt-8 text-center">
        <Link href="/login" className={TEXT_LINK}>
          <ArrowLeft
            className="size-4 transition-[translate] duration-200 ease-out group-hover:-translate-x-1"
            aria-hidden="true"
          />
          {t.forgot.backToLogin}
        </Link>
      </p>
    </div>
  );
}
