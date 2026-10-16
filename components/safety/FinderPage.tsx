"use client";

import { Check, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import Checkbox from "@/components/ui/Checkbox";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { buttonClass, choiceClass } from "@/components/ui/styles";
import { type FinderView, fetchFinder, SafetyError, tellGroup } from "@/lib/client/safety";
import { fillTemplate } from "@/lib/plan-draft";
import { callLink, formatPhone } from "@/lib/safety/contact";
import { type HelpLanguage, HELP_PHRASES } from "@/lib/safety/help-phrases";
import { CALL_ROW } from "./ContactList";
import StandaloneShell from "./StandaloneShell";

type Load = { status: "loading" } | { status: "ready"; view: FinderView } | { status: "expired" } | { status: "failed" };
type Tell = "idle" | "telling" | "told" | "failed";

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
  const calls = view
    ? [
        { key: "lead", phone: view.leadPhone, label: phrases.callLead },
        { key: "second", phone: view.secondaryPhone, label: phrases.callSecond },
      ].filter((entry): entry is { key: string; phone: string; label: string } => Boolean(entry.phone))
    : [];

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

  // A stranger gets the name of who is asking and nothing of the site: no menu, no footer.
  return (
    <StandaloneShell
      width="narrow"
      centered
      lang={language}
      dir={RTL.includes(language) ? "rtl" : "ltr"}
      className="[line-break:strict] [word-break:auto-phrase]"
    >
      {load.status === "loading" && (
        <div role="status" aria-busy="true" className="flex flex-col items-center motion-safe:animate-pulse">
          <div className="size-20 rounded-full bg-surface-muted" />
          <div className="mt-4 h-8 w-3/4 rounded-lg bg-surface-muted" />
          <div className="mt-3 h-5 w-full rounded-lg bg-surface-muted" />
          <div className="mt-8 h-14 w-full rounded-full bg-surface-muted" />
          <div className="mt-8 h-32 w-full rounded-surface border border-border bg-surface" />
        </div>
      )}
      {load.status === "expired" && (
        <p className="text-center text-body text-pretty text-text-muted motion-safe:animate-message-in">{HELP_PHRASES.en.expired}</p>
      )}
      {/* A load that failed says nothing about the card, which most likely still works: the finder is told to try
          again or call, never that the person they are standing with can no longer be helped through it. */}
      {load.status === "failed" && (
        <p className="text-center text-body text-pretty text-text-muted motion-safe:animate-message-in">{HELP_PHRASES.en.weakSignal}</p>
      )}

      {view && (
        <div className="motion-safe:animate-message-in">
          {/* The languages are a list that grows with the countries on the trip, so they wrap as chips. */}
          {view.languages.length > 1 && (
            <div
              role="group"
              aria-label={view.languages.map((entry) => HELP_PHRASES[entry].language).join(" / ")}
              className="mb-8 flex flex-wrap justify-center gap-2"
            >
              {view.languages.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  lang={entry}
                  aria-pressed={entry === language}
                  onClick={() => setPicked(entry)}
                  className={choiceClass(entry === language)}
                >
                  {entry === language && <Check className="size-4 shrink-0 motion-safe:animate-pop-in" strokeWidth={3} aria-hidden="true" />}
                  {HELP_PHRASES[entry].language}
                </button>
              ))}
            </div>
          )}

          <MemberAvatar ageGroup={view.ageGroup} variant={0} className="mx-auto size-20" />
          <h1
            className={`mt-4 text-center text-h2 text-pretty text-text sm:text-h1 ${phrases.finderTitle.includes("\u200b") ? "break-keep" : ""}`}
          >
            {fillTemplate(phrases.finderTitle, { name })}
          </h1>
          <p className="mt-2 text-center text-body text-pretty text-text-muted">{fillTemplate(phrases.finderLead, { name })}</p>
          {view.place && <p className="mt-2 text-center text-body-sm text-pretty text-text">{fillTemplate(phrases.groupAt, { place: view.place })}</p>}

          {!told && (
            <div className="mt-8">
              <button type="button" disabled={tell === "telling"} onClick={tellTheGroup} className={`${buttonClass("primary", "large")} w-full`}>
                {fillTemplate(phrases.withThem, { name })}
              </button>
              <label className="mt-2 flex min-h-11 cursor-pointer items-center justify-center gap-3 text-body-sm text-text">
                <Checkbox checked={withLocation} onChange={setWithLocation} />
                {phrases.shareLocation}
              </label>
            </div>
          )}
          {told && (
            <p role="status" className="mt-8 flex items-start gap-3 rounded-lg bg-success-subtle px-4 py-3 text-body text-pretty text-on-success-subtle motion-safe:animate-pop-in">
              <Check className="mt-1 size-5 shrink-0" strokeWidth={3} aria-hidden="true" />
              {fillTemplate(phrases.thanks, { name })}
            </p>
          )}
          {tell === "failed" && (
            <p role="alert" className="mt-4 text-center text-body-sm text-error">
              {phrases.call}
            </p>
          )}

          {calls.length > 0 && (
            <ul className="mt-8 divide-y divide-border overflow-clip rounded-surface border border-border bg-surface">
              {calls.map((entry) => (
                <li key={entry.key}>
                  <a href={callLink(entry.phone)} className={CALL_ROW}>
                    <Phone className="size-5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-label-lg text-text">{entry.label}</span>
                    <span dir="ltr" className="shrink-0 text-body-sm text-text-muted tabular-nums">
                      {formatPhone(entry.phone)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </StandaloneShell>
  );
}
