"use client";

import { Check, CloudOff, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import ErrorAlert from "@/components/ui/ErrorAlert";
import { TEXT_LINK, buttonClass } from "@/components/ui/styles";
import { type FieldPassFailure, FieldPassError, fieldPasses, isFieldPassKept, keepFieldPassOffline } from "@/lib/client/field-pass";
import type { SharedFieldPass } from "@/lib/field-pass/pass";
import { fillTemplate } from "@/lib/plan-draft";
import { useLocale } from "@/lib/use-locale";
import { useOnline } from "@/lib/use-online";
import { useMessages } from "@/lib/use-messages";
import { useSpeech } from "@/lib/use-speech";
import FieldPassDetails, { PASS_PART } from "./FieldPassDetails";

type FieldPassBodyProps = { tripId: string; destination: string };

type Status = { kind: "loading" } | { kind: "writing" } | { kind: "ready"; shared: SharedFieldPass } | { kind: "failed"; reason: FieldPassFailure };
type KeepState = "keeping" | "kept" | "failed";
type RewriteState = "idle" | "rewriting" | "tooSoon" | "failed";

const reasonOf = (caught: unknown): FieldPassFailure => (caught instanceof FieldPassError ? caught.reason : "failed");

// The inside of the field pass sheet. It is mounted each time the sheet opens: it reads the group's pass, has it
// written when nobody has yet, and keeps it on this phone for the road.
export default function FieldPassBody({ tripId, destination }: FieldPassBodyProps) {
  const text = useMessages("fieldPass");
  const locale = useLocale();
  const online = useOnline();
  const { supported, speakingId, speak } = useSpeech();
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [keepState, setKeepState] = useState<KeepState>("keeping");
  const [rewrite, setRewrite] = useState<RewriteState>("idle");
  const [speechNote, setSpeechNote] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async (): Promise<SharedFieldPass> => {
      const shared = await fieldPasses.read(tripId, locale, controller.signal);
      if (shared) return shared;
      if (!navigator.onLine) throw new FieldPassError("offline");
      setStatus({ kind: "writing" });
      return fieldPasses.write(tripId, locale, false, controller.signal);
    };
    load().then(
      async (shared) => {
        if (controller.signal.aborted) return;
        setStatus({ kind: "ready", shared });
        const kept = navigator.onLine ? await keepFieldPassOffline(tripId, locale) : await isFieldPassKept(tripId, locale);
        if (!controller.signal.aborted) setKeepState(kept ? "kept" : "failed");
      },
      (caught: unknown) => {
        if (!controller.signal.aborted) setStatus({ kind: "failed", reason: reasonOf(caught) });
      },
    );
    return () => controller.abort();
  }, [tripId, locale, attempt]);

  const retry = () => {
    setStatus({ kind: "loading" });
    setAttempt((count) => count + 1);
  };

  const keepAgain = async () => {
    setKeepState("keeping");
    setKeepState((await keepFieldPassOffline(tripId, locale)) ? "kept" : "failed");
  };

  const rewritePass = async () => {
    setRewrite("rewriting");
    try {
      const shared = await fieldPasses.write(tripId, locale, true, new AbortController().signal);
      setStatus({ kind: "ready", shared });
      setRewrite("idle");
      await keepAgain();
    } catch (caught) {
      setRewrite(reasonOf(caught) === "tooSoon" ? "tooSoon" : "failed");
    }
  };

  const speakPhrase = (words: string, id: string) => {
    if (status.kind !== "ready") return;
    const result = speak(words, status.shared.pass.languageTag, id);
    if (result === "speaking") setSpeechNote(null);
    else if (result === "unsupported") setSpeechNote(text.noSpeech);
    else setSpeechNote(fillTemplate(text.noVoice, { language: status.shared.pass.languageName || status.shared.pass.languageTag }));
  };

  if (status.kind === "loading" || status.kind === "writing") {
    // Writing a pass takes the model a while, so that wait is said out loud; reading a kept one is only shown.
    return (
      <div role="status" className="space-y-6">
        {status.kind === "writing" ? (
          <p className="flex items-start gap-3 text-body-sm text-pretty text-text-muted">
            <Loader2 className="size-5 shrink-0 text-primary motion-safe:animate-spin" aria-hidden="true" />
            {fillTemplate(text.writing, { destination })}
          </p>
        ) : (
          <span className="sr-only">{text.loading}</span>
        )}
        <div aria-hidden="true" className="divide-y divide-border motion-safe:animate-pulse">
          {[0, 1, 2].map((part) => (
            <div key={part} className={`space-y-3 ${PASS_PART}`}>
              <div className="h-5 w-1/3 rounded-lg bg-surface-muted" />
              <div className="h-7 w-3/4 rounded-lg bg-surface-muted" />
              <div className="h-11 w-36 rounded-full bg-surface-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (status.kind === "failed") {
    if (status.reason === "offline") {
      return (
        <p className="flex items-start gap-3 rounded-lg bg-surface-muted px-4 py-3 text-body-sm text-pretty text-text">
          <CloudOff className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
          {text.offlineMissing}
        </p>
      );
    }
    if (status.reason === "noDestination") return <p className="text-body text-text-muted">{text.noDestination}</p>;
    return <ErrorAlert message={text.failed} retryLabel={text.retry} onRetry={retry} />;
  }

  const { pass, generatedAt } = status.shared;
  const generatedOn = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(generatedAt));

  return (
    <div className="divide-y divide-border">
      <div className={`space-y-2 ${PASS_PART}`}>
        <p className="text-body text-pretty text-text">
          {fillTemplate(text.lead, { destination: pass.countryName || pass.destination, language: pass.languageName })}
        </p>
        <p role="status" className="flex min-h-11 flex-wrap items-center gap-x-2 text-caption text-text-muted">
          {keepState === "kept" && <Check className="size-4 shrink-0 text-success motion-safe:animate-pop-in" strokeWidth={3} aria-hidden="true" />}
          {keepState === "keeping" && <Loader2 className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />}
          {keepState === "failed" && <CloudOff className="size-4 shrink-0" aria-hidden="true" />}
          <span>{{ kept: text.kept, keeping: text.keeping, failed: text.keepFailed }[keepState]}</span>
          {keepState === "failed" && (
            <button type="button" onClick={keepAgain} className={TEXT_LINK}>
              {text.keepAgain}
            </button>
          )}
        </p>
        {!supported && <p className="text-caption text-text-muted">{text.noSpeech}</p>}
        {speechNote && supported && (
          <p role="alert" className="flex items-start gap-3 rounded-lg bg-warning-subtle px-4 py-3 text-body-sm text-pretty text-on-warning-subtle motion-safe:animate-message-in">
            <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
            {speechNote}
          </p>
        )}
      </div>

      <FieldPassDetails pass={pass} text={text} speakingId={speakingId} onSpeak={speakPhrase} />

      <div className={`space-y-2 ${PASS_PART}`}>
        <p className="text-caption text-text-muted">{fillTemplate(text.shared, { date: generatedOn })}</p>
        <button
          type="button"
          onClick={rewritePass}
          disabled={rewrite === "rewriting" || !online}
          className={buttonClass("outline", "small")}
        >
          <RefreshCw className={`size-4 ${rewrite === "rewriting" ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
          {rewrite === "rewriting" ? text.rewriting : text.rewrite}
        </button>
        <p role={rewrite === "tooSoon" || rewrite === "failed" ? "alert" : undefined} className="text-caption text-text-muted">
          {rewrite === "tooSoon" && text.tooSoon}
          {rewrite === "failed" && text.rewriteFailed}
          {(rewrite === "idle" || rewrite === "rewriting") && (online ? text.rewriteHint : text.rewriteOffline)}
        </p>
      </div>
    </div>
  );
}
