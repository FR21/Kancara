"use client";

import { type CSSProperties, useEffect, useEffectEvent, useRef, useState } from "react";
import Notice, { type NoticeMessage } from "@/components/layout/Notice";
import PageHeader from "@/components/layout/PageHeader";
import ErrorAlert from "@/components/ui/ErrorAlert";
import OfflineNote from "@/components/ui/OfflineNote";
import { type DietaryAnalysis, type ScanFailure, DietaryScanError, prepareMenuPhoto, scanMenu } from "@/lib/client/dietary-scan";
import { type Member, fillTemplate, getMemberName, NEED_CATEGORIES } from "@/lib/plan-draft";
import { formatTripTitle } from "@/lib/trips/format";
import { useLocale } from "@/lib/use-locale";
import { useMessages } from "@/lib/use-messages";
import { useOnline } from "@/lib/use-online";
import { useSpeech } from "@/lib/use-speech";
import DietaryResult, { DietaryResultSkeleton } from "./DietaryResult";
import MenuPhotoPicker from "./MenuPhotoPicker";
import WaiterQuestionCard from "./WaiterQuestionCard";

type DietaryScannerProps = {
  tripId: string;
  tripName: string;
  destination: string;
  members: Member[];
};

type Photo = { blob: Blob; url: string };

const DIET_NEEDS: readonly string[] = NEED_CATEGORIES.diet;
const failureOf = (caught: unknown): ScanFailure => (caught instanceof DietaryScanError ? caught.reason : "failed");

// The menu scanner of one trip: a photo of a menu or a label is read against what each member cannot eat, and a
// question for the staff is written in the destination's language, to show or to play.
export default function DietaryScanner({ tripId, tripName, destination, members }: DietaryScannerProps) {
  const text = useMessages("dietaryScan");
  const navText = useMessages("navbar");
  const tripsText = useMessages("trips");
  const planText = useMessages("plan");
  const locale = useLocale();
  const online = useOnline();
  const { speakingId, speak } = useSpeech();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [busy, setBusy] = useState<"idle" | "preparing" | "scanning">("idle");
  const [failure, setFailure] = useState<ScanFailure | null>(null);
  const [analysis, setAnalysis] = useState<DietaryAnalysis | null>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  const scanRef = useRef<AbortController | null>(null);

  // An object URL holds the photo in memory until it is let go.
  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);
  useEffect(() => () => scanRef.current?.abort(), []);

  // A scanned menu is read again when the language changes (Indonesian and English), so its answers follow the
  // page. The rescan reads the latest photo and result without making them reasons to scan again.
  const rescan = useEffectEvent(() => {
    if (photo && analysis) {
      scanRef.current?.abort();
      const controller = new AbortController();
      scanRef.current = controller;
      setBusy("scanning");
      setFailure(null);
      scanMenu(tripId, photo.blob, locale, controller.signal)
        .then((fresh) => {
          if (!controller.signal.aborted) setAnalysis(fresh);
        })
        .catch((caught) => {
          if (!controller.signal.aborted) setFailure(failureOf(caught));
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy("idle");
        });
    }
  });
  const currentLocaleRef = useRef(locale);
  useEffect(() => {
    if (currentLocaleRef.current === locale) return;
    currentLocaleRef.current = locale;
    rescan();
  }, [locale]);

  const restrictionsOf = (member: Member) => [
    ...member.needs.filter((need) => DIET_NEEDS.includes(need)).map((need) => planText.needs[need]),
    ...member.customNeeds,
    ...(member.allergies.trim() ? [fillTemplate(text.group.allergy, { allergy: member.allergies.trim() })] : []),
  ];
  const restricted = members
    .map((member) => ({ id: member.id, name: getMemberName(member, members, planText.ageGroups), restrictions: restrictionsOf(member) }))
    .filter((member) => member.restrictions.length > 0);
  const names = Object.fromEntries(restricted.map((member) => [member.id, member.name]));
  const tripLabel = formatTripTitle(tripName, [destination], locale, tripsText.card.untitled);

  const pick = async (file: File) => {
    scanRef.current?.abort();
    setAnalysis(null);
    setFailure(null);
    setBusy("preparing");
    try {
      const blob = await prepareMenuPhoto(file);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
    } catch (caught) {
      setFailure(failureOf(caught));
    } finally {
      setBusy("idle");
    }
  };

  const scan = async () => {
    if (!photo) return;
    const controller = new AbortController();
    scanRef.current = controller;
    setBusy("scanning");
    setFailure(null);
    try {
      setAnalysis(await scanMenu(tripId, photo.blob, locale, controller.signal));
    } catch (caught) {
      if (!controller.signal.aborted) setFailure(failureOf(caught));
    } finally {
      if (!controller.signal.aborted) setBusy("idle");
    }
  };

  const speakWords = (words: string, language: string, id: string) => {
    const result = speak(words, language, id);
    if (result === "speaking") return;
    const message = result === "unsupported" ? text.noSpeech : fillTemplate(text.noVoice, { language });
    setNotice({ id: Date.now(), tone: "error", message });
  };

  return (
    <>
      <PageHeader
        crumbs={{
          label: navText.breadcrumb,
          items: [
            { label: navText.links.trips, href: "/trips" },
            { label: tripLabel, href: `/trips/${encodeURIComponent(tripId)}` },
            { label: text.crumb },
          ],
        }}
        title={text.title}
        lead={fillTemplate(text.lead, { destination: destination || tripLabel })}
      />

      <div className="mt-8 space-y-8">
        <section aria-labelledby="diet-group-title" className="rounded-surface border border-border bg-surface p-surface motion-safe:animate-message-in">
          <h2 id="diet-group-title" className="text-h3 text-text">
            {text.group.title}
          </h2>
          {restricted.length > 0 ? (
            <ul className="mt-2 divide-y divide-border">
              {restricted.map((member, index) => (
                <li
                  key={member.id}
                  style={{ "--item-index": index } as CSSProperties}
                  className="flex flex-col gap-1 py-3 last:pb-0 motion-safe:animate-list-in sm:flex-row sm:gap-4"
                >
                  <span className="text-label wrap-anywhere text-text sm:w-40 sm:shrink-0">{member.name}</span>
                  <span className="min-w-0 text-body-sm text-pretty wrap-anywhere text-text-muted">{member.restrictions.join(", ")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-body-sm text-pretty text-text-muted">{text.group.none}</p>
          )}
        </section>

        {/* The menu is read on the server, so this is said before a photo is picked, not after Scan fails. */}
        {!online && <OfflineNote message={text.offlineNote} />}

        <MenuPhotoPicker
          text={text.picker}
          previewUrl={photo?.url ?? null}
          busy={busy}
          scanned={analysis !== null}
          onPick={pick}
          onScan={scan}
          canScan={online}
        />

        {failure && (
          <div className="motion-safe:animate-message-in">
            {failure === "failed" && photo ? (
              <ErrorAlert message={text.errors.failed} retryLabel={text.retry} onRetry={scan} />
            ) : (
              <ErrorAlert message={text.errors[failure]} />
            )}
          </div>
        )}

        {busy === "scanning" && !analysis && <DietaryResultSkeleton />}

        {analysis && (
          <div className="space-y-8 motion-safe:animate-message-in" aria-live="polite">
            <DietaryResult
              analysis={analysis}
              text={text.result}
              names={names}
              unrestricted={members.length - restricted.length}
              loading={busy === "scanning"}
            />
            {analysis.waiterQuestion && (
              <WaiterQuestionCard
                question={analysis.waiterQuestion}
                text={text.waiter}
                speakingId={speakingId}
                onSpeak={speakWords}
                readerLanguageTag={locale === "en" ? "en-US" : "id-ID"}
                loading={busy === "scanning"}
              />
            )}
          </div>
        )}
      </div>

      <Notice notice={notice} dismissLabel={text.dismiss} onDismiss={() => setNotice(null)} />
    </>
  );
}
