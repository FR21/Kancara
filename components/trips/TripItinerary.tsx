"use client";

import { ArrowLeft, ArrowRight, Compass, Languages, Luggage, Route, Trophy, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import FieldPassModal from "./FieldPassModal";
import PageBackdrop from "@/components/layout/PageBackdrop";
import ErrorAlert from "@/components/plan/ErrorAlert";
import ItineraryCard from "@/components/plan/ItineraryCard";
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from "@/components/plan/styles";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { type Itinerary, captain, captainIsSample } from "@/lib/api/captain";
import { settleLaundry } from "@/lib/api/laundry";
import { trips, TripsError } from "@/lib/api/trips";
import { formatDays, formatTripDates, plural } from "@/lib/trips/format";
import { type TripPlanView, countViolations, tripHref } from "@/lib/trips/trip";
import { useLocale } from "@/lib/use-locale";
import { useMessages } from "@/lib/use-messages";

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
  const safetyText = useMessages("safety");
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
    trips.plan(tripId, controller.signal).then(setPlan, (caught: unknown) => {
      if (controller.signal.aborted) return;
      setState(caught instanceof TripsError && caught.status === 404 ? "notFound" : "failed");
    });
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
  // the group is acting on, and it can be sent again once there is a connection.
  const changeItinerary = async (itinerary: Itinerary) => {
    if (!plan) return;
    setPlan({ ...plan, itinerary });
    setUnsaved(null);
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
    } catch {
      setUnsaved(itinerary);
    }
  };

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

  return (
    <main className="relative isolate mx-auto w-full max-w-2xl flex-1 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:max-w-5xl xl:px-0">
      <PageBackdrop />
      <Breadcrumbs
        label={navText.breadcrumb}
        items={[{ label: navText.links.trips, href: "/trips" }, { label: card?.name || text.card.untitled }]}
      />

      {!plan && state === "loading" && (
        <div role="status" className="mt-4 space-y-6 motion-safe:animate-pulse">
          <span className="sr-only">{text.itinerary.loading}</span>
          <div className="h-8 w-64 max-w-full rounded-full bg-surface-muted" />
          <div className="h-5 w-80 max-w-full rounded-full bg-surface-muted" />
          <div className="h-96 rounded-2xl border border-border bg-surface" />
        </div>
      )}

      {!plan && state === "failed" && (
        <div className="mt-6">
          <ErrorAlert message={text.itinerary.error} retryLabel={text.retry} onRetry={retry} />
        </div>
      )}

      {!plan && state === "notFound" && (
        <p className="mt-6 text-body text-pretty text-text-muted">{text.itinerary.notFound}</p>
      )}

      {plan && card && (
        <div className="motion-safe:animate-message-in">
          <h1 className="mt-2 text-h2 text-balance text-text sm:text-h1">{card.name || text.card.untitled}</h1>
          {facts.length > 0 && (
            <p className="mt-2 text-body text-pretty text-text-muted tabular-nums">{facts.join(" · ")}</p>
          )}

          {card.status !== "draft" && (
            <div className="mt-4 flex flex-wrap gap-2">
              {card.status === "completed" ? (
                <Link
                  href={`/trips/${encodeURIComponent(card.id)}/summary`}
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 text-label font-bold text-text transition-[background-color,border-color,scale] duration-150 ease-out hover:border-amber-500 hover:bg-amber-500/20 active:scale-[0.97]"
                >
                  <Trophy className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  {locale === "en" ? "Trip Recap & Memories" : "Ringkasan & Memori Perjalanan"}
                </Link>
              ) : (
                <>
                  <Link href={`/trips/${encodeURIComponent(card.id)}/packing`} className={`${OUTLINE_BUTTON} h-11`}>
                    <Luggage className="size-4" aria-hidden="true" />
                    {packingText.open}
                    <ArrowRight className="size-4 text-text-muted" aria-hidden="true" />
                  </Link>
                  <Link
                    href={`/trips/${encodeURIComponent(card.id)}/dietary-scan`}
                    className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-primary/40 bg-primary-subtle px-4 text-label font-bold text-text transition-[background-color,border-color,scale] duration-150 ease-out hover:border-primary hover:bg-primary-hover/20 active:scale-[0.97]"
                  >
                    <UtensilsCrossed className="size-4 text-primary" aria-hidden="true" />
                    {locale === "en" ? "Scan Menu & Diet" : "Pindai Menu & Pantangan"}
                  </Link>
                  <Link
                    href={`/trips/${encodeURIComponent(card.id)}/translator`}
                    className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 text-label font-bold text-text transition-[background-color,border-color,scale] duration-150 ease-out hover:border-emerald-500 hover:bg-emerald-500/20 active:scale-[0.97]"
                  >
                    <Languages className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    {locale === "en" ? "Live Translator" : "Penerjemah Obrolan"}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowFieldPass(true)}
                    className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 text-label font-bold text-text transition-[background-color,border-color,scale] duration-150 ease-out hover:border-emerald-500 hover:bg-emerald-500/20 active:scale-[0.97]"
                  >
                    <Compass className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    {locale === "en" ? "Field Pass (Offline)" : "Paspor Lapangan 🟢"}
                  </button>
                  {card.status === "ongoing" && (
                    <Link
                      href={`/trips/${encodeURIComponent(card.id)}/summary`}
                      className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 text-label font-bold text-text transition-[background-color,border-color,scale] duration-150 ease-out hover:border-amber-500 hover:bg-amber-500/20 active:scale-[0.97]"
                    >
                      <Trophy className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                      {locale === "en" ? "Trip Recap" : "Ringkasan & Memori"}
                    </Link>
                  )}
                </>
              )}
              <Link href={`/trips/${encodeURIComponent(card.id)}/packing`} className={`${OUTLINE_BUTTON} h-11`}>
                <Luggage className="size-4" aria-hidden="true" />
                {packingText.open}
                <ArrowRight className="size-4 text-text-muted" aria-hidden="true" />
              </Link>
              <Link href={`/trips/${encodeURIComponent(card.id)}/help`} className={`${OUTLINE_BUTTON} h-11`}>
                <LifeBuoy className="size-4" aria-hidden="true" />
                {safetyText.open}
                <ArrowRight className="size-4 text-text-muted" aria-hidden="true" />
              </Link>
              <Link
                href={`/trips/${encodeURIComponent(card.id)}/dietary-scan`}
                className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-primary/40 bg-primary-subtle px-4 text-label font-bold text-text transition-[background-color,border-color,scale] duration-150 ease-out hover:border-primary hover:bg-primary-hover/20 active:scale-[0.97]"
              >
                <UtensilsCrossed className="size-4 text-primary" aria-hidden="true" />
                {locale === "en" ? "Scan Menu & Diet" : "Pindai Menu & Pantangan"}
              </Link>
              <Link
                href={`/trips/${encodeURIComponent(card.id)}/translator`}
                className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 text-label font-bold text-text transition-[background-color,border-color,scale] duration-150 ease-out hover:border-emerald-500 hover:bg-emerald-500/20 active:scale-[0.97]"
              >
                <Languages className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                {locale === "en" ? "Live Translator" : "Penerjemah Obrolan"}
              </Link>
            </div>
          )}

          <div className="mt-8">
            {plan.itinerary && (
              <ItineraryCard
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

            {unsaved && (
              <div className="mt-4">
                <ErrorAlert
                  message={text.itinerary.changeFailed}
                  retryLabel={text.retry}
                  onRetry={() => changeItinerary(unsaved)}
                />
              </div>
            )}

            {!plan.itinerary && build === "building" && (
              <div role="status" className="space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
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
              <div className="rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center">
                <p className="text-label-lg text-text">{text.itinerary.missing}</p>
                <p className="mx-auto mt-2 max-w-md text-body-sm text-pretty text-text-muted">{missingHint()}</p>
                {card.status === "draft" && (
                  <Link href={tripHref(card)} className={`${OUTLINE_BUTTON} mt-6`}>
                    {text.card.continue}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                )}
                {card.status !== "draft" && (
                  <button type="button" onClick={buildItinerary} className={`${PRIMARY_BUTTON} mt-6`}>
                    <Route className="size-4" aria-hidden="true" />
                    {text.itinerary.generate}
                  </button>
                )}
              </div>
            )}

            {!plan.itinerary && build === "failed" && (
              <div className="mt-4">
                <ErrorAlert message={text.itinerary.generateFailed} retryLabel={text.retry} onRetry={buildItinerary} />
              </div>
            )}
          </div>

          <FieldPassModal
            isOpen={showFieldPass}
            onClose={() => setShowFieldPass(false)}
            tripId={card.id}
            tripName={card.name}
            destination={card.destinations[0] ?? ""}
            memberCount={card.memberCount}
            needs={card.needs}
            customNeeds={card.customNeeds}
            lodgingText={plan.draft.extras?.lodging}
          />
        </div>
      )}
    </main>
  );
}
