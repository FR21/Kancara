"use client";

import { ArrowRight, MapPinOff, Route } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import FieldPassSheet from "@/components/field-pass/FieldPassSheet";
import TripTools from "./TripTools";
import PageBackdrop from "@/components/layout/PageBackdrop";
import PageShell from "@/components/layout/PageShell";
import ErrorAlert from "@/components/ui/ErrorAlert";
import OfflineNote from "@/components/ui/OfflineNote";
import ItinerarySchedule from "@/components/plan/ItinerarySchedule";
import { OUTLINE_BUTTON, PRIMARY_BUTTON, buttonClass } from "@/components/ui/styles";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { type Itinerary, captain, captainIsSample } from "@/lib/client/captain";
import { settleLaundry } from "@/lib/client/laundry";
import { trips, TripsError } from "@/lib/client/trips";
import { formatDays, formatTripDates, formatTripTitle, plural } from "@/lib/trips/format";
import { type TripPlanView, countViolations, tripHref } from "@/lib/trips/trip";
import { useLocale } from "@/lib/use-locale";
import { useMessages } from "@/lib/use-messages";
import { useOnline } from "@/lib/use-online";
import { clearPendingItinerary, readPendingItinerary, writePendingItinerary } from "@/lib/offline";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/layout/PageHeader";

type TripItineraryProps = {
  tripId: string;
  /** Open on today's date instead of the first day, for a trip in progress. */
  openToday?: boolean;
};

type LoadState = "loading" | "failed" | "notFound";
type BuildState = "idle" | "building" | "failed";

// A saved trip's itinerary, read back from My Trips. It shows the same
// day-by-day route the planner saw when the plan was made. A trip saved
// without one can have it built here from the details it already holds.
export default function TripItinerary({ tripId, openToday = false }: TripItineraryProps) {
  const text = useMessages("trips");
  const planText = useMessages("plan");
  const packingText = useMessages("packing");
  const navText = useMessages("navbar");
  const locale = useLocale();
  const [plan, setPlan] = useState<TripPlanView | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [build, setBuild] = useState<BuildState>("idle");
  const [unsaved, setUnsaved] = useState<Itinerary | null>(null);
  const [reloads, setReloads] = useState(0);
  const [showFieldPass, setShowFieldPass] = useState(false);
  const buildControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    trips.plan(tripId, controller.signal).then(
      (loaded) => {
        // A change made here without signal is shown again over the saved plan, and waits to be sent.
        const pending = readPendingItinerary(tripId);
        setPlan(pending ? { ...loaded, itinerary: pending } : loaded);
        setUnsaved(pending);
      },
      (caught: unknown) => {
      if (controller.signal.aborted) return;
      setState(caught instanceof TripsError && caught.status === 404 ? "notFound" : "failed");
      },
    );
    return () => controller.abort();
  }, [tripId, reloads]);

  useEffect(() => () => buildControllerRef.current?.abort(), []);

  const retry = () => {
    setState("loading");
    setReloads((count) => count + 1);
  };

  const buildItinerary = async () => {
    if (!plan) return;
    const controller = new AbortController();
    buildControllerRef.current = controller;
    setBuild("building");
    try {
      const built = await captain.itinerary({ draft: plan.draft, locale }, controller.signal);
      // The laundry choice made on the packing list keeps its place on a newly made schedule. When no laundry
      // can be looked up the plan is kept as made, and the packing page adds the stops later.
      const itinerary = await settleLaundry(plan.draft, built, packingText.laundry.stops, locale, controller.signal).catch(
        () => built,
      );
      await trips.save(
        {
          name: plan.card.name,
          draft: plan.draft,
          // Sample itineraries are never checked against the group's needs, so no count is sent for them.
          violations: captainIsSample ? undefined : countViolations(itinerary),
          itinerary,
        },
        plan.card.id,
      );
      setPlan({ ...plan, itinerary });
      setBuild("idle");
    } catch {
      if (!controller.signal.aborted) setBuild("failed");
    }
  };

  // A stop switched to a backup stays switched on screen even when saving fails: on the road the change is what
  // the group is acting on. It is kept on this device too, so closing the page loses nothing, and it is sent again
  // on its own once there is a connection.
  const changeItinerary = async (itinerary: Itinerary) => {
    if (!plan) return;
    setPlan({ ...plan, itinerary });
    setUnsaved(null);
    writePendingItinerary(plan.card.id, itinerary);
    try {
      await trips.update(
        {
          name: plan.card.name,
          draft: plan.draft,
          violations: captainIsSample ? undefined : countViolations(itinerary),
          itinerary,
        },
        plan.card.id,
      );
      clearPendingItinerary(plan.card.id);
    } catch {
      setUnsaved(itinerary);
    }
  };

  // A change still waiting is sent once while there is a connection, and once more each time the connection comes
  // back; a server that keeps refusing it is not asked again and again (the alert offers a manual retry).
  const online = useOnline();
  const sendRef = useRef(changeItinerary);
  const triedRef = useRef<Itinerary | null>(null);
  useEffect(() => {
    sendRef.current = changeItinerary;
  });
  useEffect(() => {
    if (!online) {
      triedRef.current = null;
      return;
    }
    if (!unsaved || triedRef.current === unsaved) return;
    triedRef.current = unsaved;
    void sendRef.current(unsaved);
  }, [online, unsaved]);

  const card = plan?.card;
  const route = card ? [card.origin, card.destinations.join(", ")].filter(Boolean).join(" → ") : "";
  const facts = card
    ? [
        route,
        card.startDate
          ? `${formatTripDates(card.startDate, card.endDate, locale)} · ${formatDays(card.days, locale)}`
          : "",
        card.memberCount > 0 ? plural(text.card.members, card.memberCount, locale) : "",
      ].filter(Boolean)
    : [];

  const missingHint = () => {
    if (card?.status === "draft") return text.itinerary.missingDraft;
    return text.itinerary.missingOrganizer;
  };

  const tripTitle = card ? formatTripTitle(card.name, card.destinations, locale, text.card.untitled) : "";

  return (
    <PageShell width="workspace">
      <PageBackdrop />
      <Breadcrumbs
        label={navText.breadcrumb}
        items={[
          { label: navText.links.trips, href: "/trips" },
          ...(card
            ? [{ label: tripTitle }]
            : state === "loading"
            ? [{ label: "", loading: true }]
            : []),
        ]}
      />

      {!plan && state === "loading" && (
        <div role="status" className="mt-4 space-y-6 motion-safe:animate-pulse">
          <span className="sr-only">{text.itinerary.loading}</span>
          <div className="h-8 w-64 max-w-full rounded-full bg-surface-muted" />
          <div className="h-5 w-80 max-w-full rounded-full bg-surface-muted" />
          <div className="h-96 rounded-surface border border-border bg-surface" />
        </div>
      )}

      {!plan && state === "failed" && (
        <div className="mt-6">
          <ErrorAlert message={text.itinerary.error} retryLabel={text.retry} onRetry={retry} />
        </div>
      )}

      {!plan && state === "notFound" && (
        <EmptyState
          icon={MapPinOff}
          title={text.itinerary.notFoundTitle}
          body={text.itinerary.notFound}
          headingLevel={2}
          className="mt-8"
          action={
            <Link href="/trips" className={buttonClass("primary")}>
              {navText.links.trips}
            </Link>
          }
        />
      )}

      {plan && card && (
        <div className="motion-safe:animate-message-in">
          <div className="mt-4">
            <PageHeader
              title={tripTitle}
              lead={facts.length > 0 ? <span className="tabular-nums">{facts.join(" · ")}</span> : undefined}
            />
          </div>

          {(card.status === "ongoing" || card.status === "upcoming") && (
            <div className="mt-8 max-w-md">
              <TripTools tripId={card.id} text={text.tools} onOpenFieldPass={() => setShowFieldPass(true)} />
            </div>
          )}

          <div className="mt-8">
            {plan.itinerary && (
              <ItinerarySchedule
                itinerary={plan.itinerary}
                destination={card.destinations.join(", ")}
                members={plan.draft.members}
                text={planText}
                isSample={false}
                initialDate={openToday ? plan.today : undefined}
                live={card.status === "ongoing"}
                onChange={changeItinerary}
              />
            )}

            {unsaved && !online && (
              <div className="mt-4">
                <OfflineNote message={text.itinerary.waitingOffline} />
              </div>
            )}
            {unsaved && online && (
              <div className="mt-4">
                <ErrorAlert
                  message={text.itinerary.changeFailed}
                  retryLabel={text.retry}
                  onRetry={() => changeItinerary(unsaved)}
                />
              </div>
            )}

            {!plan.itinerary && build === "building" && (
              <div role="status" className="space-y-4 rounded-surface border border-border bg-surface p-surface">
                <p className="text-body-sm text-text-muted">{text.itinerary.generating}</p>
                <div className="space-y-3 motion-safe:animate-pulse">
                  <div className="h-4 w-40 rounded-full bg-surface-muted" />
                  <div className="h-12 rounded-lg bg-surface-muted" />
                  <div className="h-4 w-3/4 rounded-full bg-surface-muted" />
                  <div className="h-4 w-1/2 rounded-full bg-surface-muted" />
                </div>
              </div>
            )}

            {!plan.itinerary && build !== "building" && (
              <EmptyState
                icon={Route}
                title={text.itinerary.missing}
                body={missingHint()}
                headingLevel={2}
                action={
                  card.status === "draft" ? (
                    <Link href={tripHref(card)} className={OUTLINE_BUTTON}>
                      {text.card.continue}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  ) : (
                    <button type="button" onClick={buildItinerary} className={PRIMARY_BUTTON}>
                      <Route className="size-4" aria-hidden="true" />
                      {text.itinerary.generate}
                    </button>
                  )
                }
              />
            )}

            {!plan.itinerary && build === "failed" && (
              <div className="mt-4">
                <ErrorAlert message={text.itinerary.generateFailed} retryLabel={text.retry} onRetry={buildItinerary} />
              </div>
            )}
          </div>

          <FieldPassSheet
            isOpen={showFieldPass}
            onClose={() => setShowFieldPass(false)}
            tripId={card.id}
            destination={card.destinations[0] ?? ""}
          />
        </div>
      )}
    </PageShell>
  );
}
