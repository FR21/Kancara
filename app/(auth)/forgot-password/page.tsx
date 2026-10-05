"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useMessages } from "@/lib/use-messages";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const t = useMessages("auth");
  
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(t.errors.default);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center font-heading text-h2 font-bold tracking-tight text-text">
          {t.forgot.title}
        </h2>
        <p className="mt-2 text-center text-body text-text-muted">
          {t.forgot.subtitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface px-4 py-8 shadow-sm shadow-neutral-950/10 sm:rounded-xl sm:px-10 border border-border">
          {success ? (
            <div className="rounded-md bg-success-subtle p-6 text-center">
              <CheckCircle2 className="mx-auto size-12 text-success mb-4" />
              <p className="text-body font-medium text-on-success-subtle">{t.forgot.success}</p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleReset}>
              {error && (
                <div className="rounded-md bg-error-subtle p-4">
                  <p className="text-body-sm font-medium text-on-error-subtle">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-label-sm font-medium text-text">
                  {t.forgot.emailLabel}
                </label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="size-5 text-text-muted" aria-hidden="true" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full rounded-md border border-border-strong bg-background py-3 pl-10 pr-3 text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-body-sm transition-colors"
                    placeholder={t.forgot.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-xl bg-primary px-3 py-3 text-label font-semibold text-on-primary shadow-sm hover:bg-primary-hover active:scale-[0.98] transition-[background-color,transform] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? <Loader2 className="size-5 animate-spin" /> : t.forgot.submit}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-body-sm text-text-muted">
          <Link
            href="/login"
            className="font-medium text-primary hover:text-primary-hover transition-colors p-2 -m-2 inline-flex items-center"
          >
            &larr; {t.forgot.backToLogin}
          </Link>
        </p>
      </div>
    </div>
  );
}
