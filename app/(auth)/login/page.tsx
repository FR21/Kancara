"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { createSession } from "@/lib/auth/session";
import { useMessages } from "@/lib/use-messages";
import { Mail, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const t = useMessages("auth");
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      const sessionResult = await createSession(idToken);
      if (sessionResult.success) {
        await auth.signOut(); // Clear client-side state
        router.push("/trips");
        router.refresh();
      } else {
        setError(sessionResult.error || t.errors.default);
      }
    } catch (err: unknown) {
      console.error(err);
      setError(t.errors.default);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();

    try {
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();
      
      const sessionResult = await createSession(idToken);
      if (sessionResult.success) {
        await auth.signOut();
        router.push("/trips");
        router.refresh();
      } else {
        setError(sessionResult.error || t.errors.default);
      }
    } catch (err: unknown) {
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
          {t.login.title}
        </h2>
        <p className="mt-2 text-center text-body text-text-muted">
          {t.login.subtitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface px-4 py-8 shadow-sm shadow-neutral-950/10 sm:rounded-xl sm:px-10 border border-border">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="rounded-md bg-error-subtle p-4">
                <p className="text-body-sm font-medium text-on-error-subtle">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-label-sm font-medium text-text">
                {t.login.emailLabel}
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
                  placeholder={t.login.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-label-sm font-medium text-text">
                {t.login.passwordLabel}
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="size-5 text-text-muted" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-md border border-border-strong bg-background py-3 pl-10 pr-3 text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-body-sm transition-colors"
                  placeholder={t.login.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="size-5 rounded border-border-strong text-primary focus:ring-primary"
                />
                <label htmlFor="remember-me" className="ml-2 block text-label-sm text-text-muted">
                  {t.login.rememberMe}
                </label>
              </div>

              <div className="text-label-sm">
                <Link
                  href="/forgot-password"
                  className="font-medium text-primary hover:text-primary-hover active:text-primary-hover p-2 -m-2"
                >
                  {t.login.forgotPassword}
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-xl bg-primary px-3 py-3 text-label font-semibold text-on-primary shadow-sm hover:bg-primary-hover active:scale-[0.98] transition-[background-color,transform] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? <Loader2 className="size-5 animate-spin" /> : t.login.submit}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-caption font-medium">
                <span className="bg-surface px-2 text-text-muted">Atau</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-surface-muted px-3 py-3 text-label font-semibold text-text shadow-sm ring-1 ring-inset ring-border hover:bg-border active:scale-[0.98] transition-[background-color,transform] disabled:opacity-50 disabled:pointer-events-none"
              >
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
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                {t.login.google}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-body-sm text-text-muted">
          {t.login.noAccount}{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:text-primary-hover transition-colors p-2 -m-2"
          >
            {t.login.registerLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
