"use client";

import { ArrowRight, CircleAlert, Loader2, Luggage, RotateCw } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import type { Itinerary } from "@/lib/client/captain";
import type { Messages } from "@/lib/messages";
import type { PlanDraft } from "@/lib/plan-draft";
import { useMessages } from "@/lib/use-messages";
import AgreementList from "./AgreementList";
import DeckFooter, { FORWARD_ARROW } from "./DeckFooter";
import ErrorAlert from "@/components/ui/ErrorAlert";
import ItinerarySchedule from "@/components/plan/ItinerarySchedule";
import { PRIMARY_BUTTON, TEXT_LINK } from "@/components/ui/styles";
import Disclosure from "@/components/ui/Disclosure";

export type SaveState = "idle" | "saving" | "saved" | "failed";

type PlanResultProps = {
  draft: PlanDraft;
  text: Messages["plan"];
  itinerary: Itinerary | null;
  /** True while the itinerary is being made. */
  pending: boolean;
  failed: boolean;
  isSample: boolean;
  saveState: SaveState;
  /** Where the saved trip's packing list is. Null until the trip has been saved. */
  packingHref: string | null;
  onRetry: () => void;
  onSave: () => void;
  onChangeItinerary: (itinerary: Itinerary) => void;
  onChangeAgreements: () => void;
  onBackToPass: () => void;
};

const SKELETON_STOPS = [0, 1, 2];

/** Where the plan stands with My Trips, beside the title: saving, saved with the way there, or a retry. */
function SaveStatus({ state, text, onSave }: { state: SaveState; text: Messages["plan"]["result"]; onSave: () => void }) {
  if (state === "saving") {
    return (
      <p role="status" className="flex min-h-11 items-center gap-2 text-body-sm text-text-muted">
        <Loader2 className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
        {text.saving}
      </p>
    );
  }
  if (state === "saved") {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4">
      <p role="alert" className="flex min-h-11 items-center gap-2 text-body-sm text-error">
        <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
        {text.saveFailed}
      </p>
      <button type="button" onClick={onSave} className={TEXT_LINK}>
        <RotateCw className="size-4" aria-hidden="true" />
        {text.saveRetry}
      </button>
    </div>
  );
}

export default function PlanResult({
  draft,
  text,
  itinerary,
  pending,
  failed,
  isSample,
  saveState,
  packingHref,
  onRetry,
  onSave,
  onChangeItinerary,
  onChangeAgreements,
  onBackToPass,
}: PlanResultProps) {
  const packingText = useMessages("packing");
  const showSave = itinerary !== null && !pending && saveState !== "idle";

  return (
    <div className="space-y-8">
      <PageHeader
        titleId="plan-title"
        title={text.result.title}
        lead={pending ? text.chat.itineraryPending : text.chat.itineraryIntro}
        actions={showSave && <SaveStatus state={saveState} text={text.result} onSave={onSave} />}
      />

      {/* Shaped like the schedule it stands in for: the title bar, then a timeline of stops. */}
      {pending && (
        <div role="status" className="overflow-clip rounded-surface border border-border bg-surface motion-safe:animate-pulse">
          <span className="sr-only">{text.chat.itineraryPending}</span>
          <div className="border-b border-border px-surface py-4">
            <div className="h-6 w-48 rounded-full bg-surface-muted" />
          </div>
          <div className="flex gap-2 border-b border-border px-surface py-3">
            <div className="h-11 w-28 rounded-full bg-surface-muted" />
            <div className="h-11 w-28 rounded-full bg-surface-muted" />
          </div>
          <div className="space-y-4 p-surface">
            <div className="h-6 w-2/3 rounded-full bg-surface-muted" />
            {SKELETON_STOPS.map((stop) => (
              <div key={stop} className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3 sm:grid-cols-[5.5rem_minmax(0,1fr)]">
                <div className="ml-auto h-4 w-12 rounded-full bg-surface-muted" />
                <div className="h-20 rounded-lg bg-surface-muted" />
              </div>
            ))}
          </div>
        </div>
      )}

      {itinerary && (
        <div className="motion-safe:animate-message-in">
          <ItinerarySchedule
            itinerary={itinerary}
            destination={draft.destinations.join(", ")}
            members={draft.members}
            text={text}
            isSample={isSample}
            onChange={onChangeItinerary}
          />
        </div>
      )}

      {/* The agreements behind the plan are there for whoever wants them; the itinerary above is the answer. */}
      {itinerary && !pending && (
        <Disclosure showLabel={text.result.agreementsShow} hideLabel={text.result.agreementsHide}>
          <AgreementList draft={draft} text={text} onChange={onChangeAgreements} />
        </Disclosure>
      )}

      {failed && <ErrorAlert message={text.chat.error} retryLabel={text.chat.retry} onRetry={onRetry} />}

      {/* The ways on from here, pinned at the foot like every step of the plan: back to the pass, and the saved
          trip's packing list as the one thing to do next. */}
      <DeckFooter backLabel={text.result.backToPass} onBack={onBackToPass} note={null}>
        {itinerary && !pending && packingHref && (
          <Link href={packingHref} className={`group ${PRIMARY_BUTTON} motion-safe:animate-message-in`}>
            <Luggage className="size-4" aria-hidden="true" />
            {packingText.open}
            <ArrowRight className={FORWARD_ARROW} aria-hidden="true" />
          </Link>
        )}
      </DeckFooter>
    </div>
  );
}
