"use client";

import { Check, Phone } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import Checkbox from "@/components/plan/Checkbox";
import MemberAvatar from "@/components/plan/MemberAvatar";
import { choiceClass, PRIMARY_BUTTON } from "@/components/plan/styles";
import { type FinderView, fetchFinder, SafetyError, tellGroup } from "@/lib/api/safety";
import { fillTemplate } from "@/lib/plan-draft";
import { callLink, formatPhone } from "@/lib/safety/contact";
import { type HelpLanguage, HELP_PHRASES } from "@/lib/safety/help-phrases";

type Load = { status: "loading" } | { status: "ready"; view: FinderView } | { status: "expired" } | { status: "failed" };
type Tell = "idle" | "telling" | "told" | "failed";

const CALL =
  "flex min-h-14 items-center gap-3 rounded-2xl border border-border-strong px-4 py-2 text-left transition-[background-color,border-color,scale] duration-150 ease-out hover:border-primary hover:bg-primary-subtle active:scale-[0.99]";
const RTL: HelpLanguage[] = ["ar"];

// What a stranger sees after scanning a meeting card: who they are with, one action that tells the group, and
// the numbers to call. No sign-in, no app, and it speaks the language of the place before English.
export default function FinderPage({ token }: { token: string }) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [picked, setPicked] = useState<HelpLanguage | null>(null);
  const [withLocation, setWithLocation] = useState(false);
  const [tell, setTell] = useState<Tell>("idle");

  useEffect(() => {
    const controller = new AbortController();
    fetchFinder(token, controller.signal).then(
      (view) => setLoad({ status: "ready", view }),
      (caught: unknown) => {
        if (controller.signal.aborted) return;
        const gone = caught instanceof SafetyError && (caught.status === 404 || caught.status === 410);
        setLoad({ status: gone ? "expired" : "failed" });
      },
    );
    return () => controller.abort();
  }, [token]);

  const view = load.status === "ready" ? load.view : null;
  const language = picked ?? view?.languages[0] ?? "en";
  const phrases = HELP_PHRASES[language];
  const name = view?.name ?? "";
  const told = tell === "told" || (view?.told ?? false);

  const send = async (location: { latitude: number; longitude: number } | null) => {
    try {
      await tellGroup(token, location);
      setTell("told");
    } catch {
      setTell("failed");
    }
  };
  const tellTheGroup = () => {
    setTell("telling");
    if (!withLocation || !("geolocation" in navigator)) return send(null);
    // A location that cannot be read does not hold the message back.
    navigator.geolocation.getCurrentPosition(
      (position) => send({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => send(null),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  return (
    <main
      lang={language}
      dir={RTL.includes(language) ? "rtl" : "ltr"}
      className="mx-auto w-full max-w-md flex-1 px-4 pt-8 pb-16 [line-break:strict] [word-break:auto-phrase] sm:px-6 sm:pt-12"
    >
      {/* A stranger gets the name of who is asking and nothing of the site: no menu, no footer. */}
      <Image src="/images/logo/kancara_wordmark_logo.webp" alt="Kancara" width={866} height={288} loading="eager" className="mx-auto mb-8 h-10 w-auto" />
      {load.status === "loading" && (
        <div role="status" aria-busy="true" className="space-y-4 motion-safe:animate-pulse">
          <div className="mx-auto size-20 rounded-full bg-surface-muted" />
          <div className="h-8 rounded-full bg-surface-muted" />
          <div className="h-14 rounded-full bg-surface-muted" />
        </div>
      )}
      {(load.status === "expired" || load.status === "failed") && (
        <p className="text-center text-body text-pretty text-text-muted">{HELP_PHRASES.en.expired}</p>
      )}

      {view && (
        <div className="motion-safe:animate-message-in">
          {view.languages.length > 1 && (
            <div
              role="group"
              aria-label={view.languages.map((entry) => HELP_PHRASES[entry].language).join(" / ")}
              className="mb-6 flex flex-wrap justify-center gap-2">
              {view.languages.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  lang={entry}
                  aria-pressed={entry === language}
                  onClick={() => setPicked(entry)}
                  className={choiceClass(entry === language)}
                >
                  {entry === language && <Check className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />}
                  {HELP_PHRASES[entry].language}
                </button>
              ))}
            </div>
          )}

          <MemberAvatar ageGroup={view.ageGroup} variant={0} className="mx-auto size-20" />
          <h1 className={`mt-4 text-center text-h2 text-pretty text-text ${phrases.finderTitle.includes("\u200b") ? "[word-break:keep-all]" : ""}`}>
            {fillTemplate(phrases.finderTitle, { name })}
          </h1>
          <p className="mt-3 text-center text-body text-pretty text-text-muted">{fillTemplate(phrases.finderLead, { name })}</p>
          {view.place && <p className="mt-3 text-center text-body-sm text-pretty text-text">{fillTemplate(phrases.groupAt, { place: view.place })}</p>}

          {!told && (
            <div className="mt-8">
              <button type="button" disabled={tell === "telling"} onClick={tellTheGroup} className={`${PRIMARY_BUTTON} h-16 w-full text-label-lg`}>
                {fillTemplate(phrases.withThem, { name })}
              </button>
              <label className="mt-4 flex cursor-pointer items-center justify-center gap-3 text-body-sm text-text">
                <Checkbox checked={withLocation} onChange={setWithLocation} />
                {phrases.shareLocation}
              </label>
            </div>
          )}
          {told && (
            <p role="status" className="mt-8 flex items-start gap-3 rounded-2xl bg-success-subtle px-4 py-4 text-body text-pretty text-on-success-subtle">
              <Check className="mt-1 size-5 shrink-0" strokeWidth={3} aria-hidden="true" />
              {fillTemplate(phrases.thanks, { name })}
            </p>
          )}
          {tell === "failed" && (
            <p role="alert" className="mt-4 text-center text-body-sm text-error">
              {phrases.call}
            </p>
          )}

          <ul className="mt-8 space-y-3">
            {view.leadPhone && (
              <li>
                <a href={callLink(view.leadPhone)} className={CALL}>
                  <Phone className="size-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-label-lg text-text">{phrases.callLead}</span>
                  <span dir="ltr" className="shrink-0 text-body-sm text-text-muted tabular-nums">
                    {formatPhone(view.leadPhone)}
                  </span>
                </a>
              </li>
            )}
            {view.secondaryPhone && (
              <li>
                <a href={callLink(view.secondaryPhone)} className={CALL}>
                  <Phone className="size-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-label-lg text-text">{phrases.callSecond}</span>
                  <span dir="ltr" className="shrink-0 text-body-sm text-text-muted tabular-nums">
                    {formatPhone(view.secondaryPhone)}
                  </span>
                </a>
              </li>
            )}
          </ul>
        </div>
      )}
    </main>
  );
}
