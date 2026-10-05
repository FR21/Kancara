"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Itinerary } from "@/lib/api/captain";
import type { Messages } from "@/lib/messages";
import type { PlanDraft } from "@/lib/plan-draft";
import ErrorAlert from "./ErrorAlert";
import InviteCard from "./InviteCard";
import ItineraryCard from "./ItineraryCard";
import { GHOST_BUTTON, PRIMARY_BUTTON } from "./styles";

type PlanResultProps = {
  draft: PlanDraft;
  text: Messages["plan"];
  itinerary: Itinerary | null;
  inviteUrl: string | null;
  pending: "itinerary" | "invite" | null;
  failed: boolean;
  isSample: boolean;
  onRetry: () => void;
  onInvite: () => void;
  onBackToPass: () => void;
};

export default function PlanResult({
  draft,
  text,
  itinerary,
  inviteUrl,
  pending,
  failed,
  isSample,
  onRetry,
  onInvite,
  onBackToPass,
}: PlanResultProps) {
  const isSolo = draft.members.length <= 1;
  const canInvite = itinerary !== null && inviteUrl === null && !isSolo && pending === null && !failed;

  return (
    <div className="space-y-6 motion-safe:animate-message-in">
      <div>
        <h1 tabIndex={-1} className="text-h2 text-balance text-text outline-none lg:text-h1">
          {text.result.title}
        </h1>
        <p className="mt-2 text-body text-text-muted">
          {pending === "itinerary" ? text.chat.itineraryPending : text.chat.itineraryIntro}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-4">
          {pending === "itinerary" && (
            <div
              role="status"
              className="space-y-3 rounded-2xl border border-border bg-surface p-5 motion-safe:animate-pulse"
            >
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
        </div>

        <div className="space-y-4">
          {canInvite && (
            <button type="button" onClick={onInvite} className={`${PRIMARY_BUTTON} w-full shadow-md shadow-primary/20`}>
              {text.chat.makeInvite}
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
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

          {itinerary && pending === null && <p className="text-body-sm text-text-muted">{text.chat.done}</p>}

          <button type="button" onClick={onBackToPass} className={`${GHOST_BUTTON} -ml-4`}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {text.result.backToPass}
          </button>
        </div>
      </div>
    </div>
  );
}
