"use client";

import { ArrowLeft, ArrowRight, Check, CircleAlert, Loader2, RotateCcw } from "lucide-react";
import Link from "next/link";
import type { Itinerary } from "@/lib/api/captain";
import type { Messages } from "@/lib/messages";
import type { PlanDraft } from "@/lib/plan-draft";
import ErrorAlert from "./ErrorAlert";
import InviteCard from "./InviteCard";
import ItineraryCard from "./ItineraryCard";
import { GHOST_BUTTON, PRIMARY_BUTTON } from "./styles";

export type SaveState = "idle" | "saving" | "saved" | "failed";

type PlanResultProps = {
  draft: PlanDraft;
  text: Messages["plan"];
  itinerary: Itinerary | null;
  inviteUrl: string | null;
  pending: "itinerary" | "invite" | null;
  failed: boolean;
  isSample: boolean;
  saveState: SaveState;
  onRetry: () => void;
  onInvite: () => void;
  onSave: () => void;
  onBackToPass: () => void;
};

const STRIP = "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-border bg-surface px-4 py-2";
const STRIP_ACTION =
  "group inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm text-label text-primary underline-offset-4 hover:underline";

export default function PlanResult({
  draft,
  text,
  itinerary,
  inviteUrl,
  pending,
  failed,
  isSample,
  saveState,
  onRetry,
  onInvite,
  onSave,
  onBackToPass,
}: PlanResultProps) {
  const isSolo = draft.members.length <= 1;
  const canInvite = itinerary !== null && inviteUrl === null && !isSolo && pending === null && !failed;
  const showSave = itinerary !== null && pending !== "itinerary" && saveState !== "idle";

  return (
    <div className="space-y-6 motion-safe:animate-message-in">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 tabIndex={-1} className="text-h2 text-balance text-text outline-none lg:text-h1">
            {text.result.title}
          </h1>
          <p className="mt-2 text-body text-pretty text-text-muted">
            {pending === "itinerary" ? text.chat.itineraryPending : text.chat.itineraryIntro}
          </p>
        </div>
        {canInvite && (
          <button
            type="button"
            onClick={onInvite}
            className={`${PRIMARY_BUTTON} w-full shadow-md shadow-primary/20 sm:w-auto`}
          >
            {text.chat.makeInvite}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {showSave && (
        <div className={STRIP}>
          {saveState === "saving" && (
            <p role="status" className="flex min-h-11 items-center gap-2 text-body-sm text-text-muted">
              <Loader2 className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
              {text.result.saving}
            </p>
          )}
          {saveState === "saved" && (
            <>
              <p className="flex items-center gap-2 text-body-sm text-text">
                <Check
                  className="size-4 shrink-0 text-success motion-safe:animate-stamp-in"
                  strokeWidth={3}
                  aria-hidden="true"
                />
                {text.result.saved}
              </p>
              <Link href="/trips" className={STRIP_ACTION}>
                {text.result.viewTrips}
                <ArrowRight
                  className="size-4 transition-[translate] duration-200 ease-out group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </>
          )}
          {saveState === "failed" && (
            <>
              <p role="alert" className="flex items-center gap-2 text-body-sm text-error">
                <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                {text.result.saveFailed}
              </p>
              <button type="button" onClick={onSave} className={STRIP_ACTION}>
                <RotateCcw className="size-4" aria-hidden="true" />
                {text.result.saveRetry}
              </button>
            </>
          )}
        </div>
      )}

      {pending === "invite" && (
        <p role="status" className="text-body-sm text-text-muted">
          {text.chat.typing}
        </p>
      )}

      {inviteUrl && (
        <div className="motion-safe:animate-message-in">
          <InviteCard url={inviteUrl} text={text.invite} />
        </div>
      )}

      {pending === "itinerary" && (
        <div role="status" className="space-y-3 rounded-2xl border border-border bg-surface p-5 motion-safe:animate-pulse">
          <span className="sr-only">{text.chat.itineraryPending}</span>
          <div className="h-4 w-40 rounded-full bg-surface-muted" />
          <div className="h-12 rounded-lg bg-surface-muted" />
          <div className="h-4 w-3/4 rounded-full bg-surface-muted" />
          <div className="h-4 w-1/2 rounded-full bg-surface-muted" />
          <div className="h-4 w-2/3 rounded-full bg-surface-muted" />
        </div>
      )}

      {itinerary && (
        <ItineraryCard
          itinerary={itinerary}
          destination={draft.destinations.join(", ")}
          members={draft.members}
          text={text}
          isSample={isSample}
        />
      )}

      {failed && <ErrorAlert message={text.chat.error} retryLabel={text.chat.retry} onRetry={onRetry} />}

      <button type="button" onClick={onBackToPass} className={`${GHOST_BUTTON} -ml-4`}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        {text.result.backToPass}
      </button>
    </div>
  );
}
