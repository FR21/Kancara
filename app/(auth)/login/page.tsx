"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import AuthHeading from "@/components/auth/AuthHeading";
import { FormAlert, GoogleButton, OrDivider, SubmitButton } from "@/components/auth/AuthParts";
import TextField from "@/components/auth/TextField";
import { TEXT_LINK } from "@/components/ui/styles";
import { signInWithGoogle, startSession } from "@/lib/auth/client";
import { useAuthFlow } from "@/lib/auth/use-auth-flow";
import { postLoginPath } from "@/lib/auth/routes";
import { emailIssue } from "@/lib/auth/validation";
import { auth } from "@/lib/firebase/client";
import { useMessages } from "@/lib/use-messages";

export default function LoginPage() {
  const t = useMessages("auth");
  const { pending, error, run } = useAuthFlow();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [attempted, setAttempted] = useState(false);

  const emailKey = emailIssue(email);
  const emailError = attempted && emailKey ? t.errors[emailKey] : "";
  const passwordError = attempted && password === "" ? t.errors.required : "";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (emailKey) {
      document.getElementById("login-email")?.focus();
      return;
    }
    if (password === "") {
      document.getElementById("login-password")?.focus();
      return;
    }
    run(async () => {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      return (await startSession(credential.user)) ? postLoginPath(window.location.search) : null;
    });
  };

  const handleGoogle = () =>
    run(async () => ((await signInWithGoogle()) ? postLoginPath(window.location.search) : null));

  return (
    <div className="motion-safe:animate-message-in">
      <AuthHeading title={t.login.title} subtitle={t.login.subtitle} />

      <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4">
        <FormAlert message={error} />
        <TextField
          id="login-email"
          type="email"
          label={t.login.emailLabel}
          placeholder={t.login.emailPlaceholder}
          autoComplete="email"
          inputMode="email"
          value={email}
          error={emailError}
          disabled={pending}
          onChange={setEmail}
        />
        <TextField
          id="login-password"
          type="password"
          label={t.login.passwordLabel}
          placeholder={t.login.passwordPlaceholder}
          autoComplete="current-password"
          value={password}
          error={passwordError}
          disabled={pending}
          reveal={{ show: t.common.showPassword, hide: t.common.hidePassword }}
          aside={
            <Link href="/forgot-password" className={`${TEXT_LINK} -my-3`}>
              {t.login.forgotPassword}
            </Link>
          }
          onChange={setPassword}
        />
        <SubmitButton pending={pending} className="mt-2 w-full">
          {t.login.submit}
        </SubmitButton>
      </form>

      <div className="mt-4 flex flex-col gap-4">
        <OrDivider label={t.common.or} />
        <GoogleButton label={t.login.google} disabled={pending} onClick={handleGoogle} />
      </div>

      <p className="mt-8 text-center text-body-sm text-text-muted">
        {t.login.noAccount}{" "}
        <Link href="/register" className={TEXT_LINK}>
          {t.login.registerLink}
        </Link>
      </p>
    </div>
  );
}
