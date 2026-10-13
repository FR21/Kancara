"use client";

import { ArrowRight, Check, CloudOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import PageBackdrop from "@/components/layout/PageBackdrop";
import ErrorAlert from "@/components/plan/ErrorAlert";
import { OUTLINE_BUTTON } from "@/components/plan/styles";
import { settleLaundry } from "@/lib/api/laundry";
import { trips, TripsError } from "@/lib/api/trips";
import { laundryInSync, planLaundry } from "@/lib/laundry";
import { clearPendingPacking, readPendingPacking, writePendingPacking } from "@/lib/offline";
import { type PlanDraftAction, planDraftReducer } from "@/lib/plan-draft";
import { formatDays, formatTripDates } from "@/lib/trips/format";
import { type TripPlanView, tripHref } from "@/lib/trips/trip";
import { useLocale } from "@/lib/use-locale";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { useMessages } from "@/lib/use-messages";
import { useOnline } from "@/lib/use-online";
import PackingBoard, { type LaundrySync } from "./PackingBoard";

type LoadState = "loading" | "failed" | "notFound";
/** "waiting" is a change kept on this device because there was no connection to send it. */
type SaveState = "idle" | "saving" | "saved" | "failed" | "waiting";

// Ticking goes fast, so the trip is saved once the hand has rested instead of on every tick.
const SAVE_DELAY_MS = 700;

// The packing list of a saved trip. What the group ticks, removes, and adds is kept inside the trip's plan, so
// it is there again on any device the trip is opened on. Without a connection the changes wait on this device
// and are sent as soon as one is back.
export default function PackingList({ tripId }: { tripId: string }) {
  const text = useMessages("packing");
  const planText = useMessages("plan");
  const tripsText = useMessages("trips");
  const navText = useMessages("navbar");
  const locale = useLocale();
  const online = useOnline();
  const [plan, setPlan] = useState<TripPlanView | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [save, setSave] = useState<SaveState>("idle");
  const [reloads, setReloads] = useState(0);
  const latestRef = useRef<TripPlanView | null>(null);
  const timerRef = useRef<number | null>(null);
  // True while a change is kept on this device for want of a connection.
  const waitingRef = useRef(false);
  const [laundrySync, setLaundrySync] = useState<LaundrySync>("idle");
  const lookupRef = useRef<AbortController | null>(null);

  const saveNow = async () => {
    timerRef.current = null;
    const current = latestRef.current;
    if (!current) return;
    waitingRef.current = false;
    setSave("saving");
    try {
      await trips.update(
        {
          name: current.card.name,
          draft: current.draft,
          // The stored count and itinerary go back as they are: saving a tick must not wipe either.
          violations: current.card.violations,
          ...(current.itinerary ? { itinerary: current.itinerary } : {}),
        },
        current.card.id,
      );
      // A newer change may have been queued while this one was on its way; that one reports for itself.
      if (latestRef.current !== current) return;
      clearPendingPacking(tripId);
      setSave("saved");
    } catch {
      waitingRef.current = !navigator.onLine;
      setSave(waitingRef.current ? "waiting" : "failed");
    }
  };

  const scheduleSave = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(saveNow, SAVE_DELAY_MS);
  };

  const keep = (next: TripPlanView) => {
    latestRef.current = next;
    setPlan(next);
    scheduleSave();
  };

  // Looks up the laundries the choice needs and writes their stops into the itinerary. Ticks made meanwhile
  // stay: only the itinerary of the latest plan is replaced.
  const findLaundry = async () => {
    lookupRef.current?.abort();
    const current = latestRef.current;
    if (!current?.itinerary || laundryInSync(current.draft, current.itinerary)) {
      setLaundrySync("idle");
      return;
    }
    const controller = new AbortController();
    lookupRef.current = controller;
    setLaundrySync("looking");
    try {
      const stops = text.laundry.stops;
      const itinerary = await settleLaundry(current.draft, current.itinerary, stops, locale, controller.signal);
      const latest = latestRef.current;
      if (controller.signal.aborted || !latest) return;
      keep({ ...latest, itinerary });
      setLaundrySync("idle");
    } catch {
      if (!controller.signal.aborted) setLaundrySync(navigator.onLine ? "failed" : "waiting");
    }
  };

  // Brings the itinerary in line with the laundry choice. Stops that no longer apply go and washing goes in at
  // once, since neither needs a connection; a laundry to visit is looked up after.
  const syncLaundry = () => {
    const current = latestRef.current;
    if (current?.itinerary && !laundryInSync(current.draft, current.itinerary)) {
      keep({ ...current, itinerary: planLaundry(current.draft, current.itinerary, text.laundry.stops) });
    }
    findLaundry();
  };

  useEffect(() => {
    const controller = new AbortController();
    trips.plan(tripId, controller.signal).then(
      (loaded) => {
        // Changes made here without a connection outrank the copy the server holds, and go out now.
        const kept = readPendingPacking(tripId);
        const current = kept ? { ...loaded, draft: { ...loaded.draft, packing: kept } } : loaded;
        latestRef.current = current;
        setPlan(current);
        if (kept) scheduleSave();
        syncLaundry();
      },
      (caught: unknown) => {
        if (controller.signal.aborted) return;
        setState(caught instanceof TripsError && caught.status === 404 ? "notFound" : "failed");
      },
    );
    return () => controller.abort();
    // Loading happens once per trip and on an asked-for retry; saving reads the latest plan through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, reloads]);

  // A change that waited for a connection is sent the moment one is back, and a laundry that could not be
  // looked up is looked up then.
  useEffect(() => {
    const resend = () => {
      if (waitingRef.current) saveNow();
      findLaundry();
    };
    window.addEventListener("online", resend);
    return () => window.removeEventListener("online", resend);
    // The handler reads the latest plan through a ref, so it never needs to be set up again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaving the page with a save still waiting sends it at once.
  useEffect(
    () => () => {
      lookupRef.current?.abort();
      if (timerRef.current === null) return;
      window.clearTimeout(timerRef.current);
      saveNow();
    },
    // The cleanup reads the latest plan through a ref, so it never needs to be set up again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const change = (action: PlanDraftAction) => {
    if (!plan) return;
    const next = { ...plan, draft: planDraftReducer(plan.draft, action) };
    keep(next);
    writePendingPacking(tripId, next.draft.packing);
    if (action.type === "setLaundry") syncLaundry();
  };

  const retryLoad = () => {
    setState("loading");
    setReloads((count) => count + 1);
  };

  const card = plan?.card;
  const ready = card !== undefined && card.status !== "draft" && card.startDate !== "" && card.memberCount > 0;
  const facts = card
    ? [
        [card.origin, card.destinations.join(", ")].filter(Boolean).join(" → "),
        card.startDate
          ? `${formatTripDates(card.startDate, card.endDate, locale)} · ${formatDays(card.days, locale)}`
          : "",
      ].filter(Boolean)
    : [];
  const waiting = save === "waiting" || (!online && save !== "saving");

  return (
    <main className="relative isolate mx-auto w-full max-w-2xl flex-1 px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:max-w-5xl xl:px-0">
      <PageBackdrop />
      {/* The save status shares the line of the way back, so it never takes a line of its own from the list. */}
      <div className="flex items-center justify-between gap-4">
        <Breadcrumbs
          label={navText.breadcrumb}
          items={[
            { label: navText.links.trips, href: "/trips" },
            // A draft has no itinerary page to step back to.
            ...(card && card.status !== "draft" ? [{ label: card.name || text.back, href: `/trips/${encodeURIComponent(tripId)}` }] : []),
            { label: text.title },
          ]}
        />
        <p role="status" className="flex min-w-0 items-center gap-2 text-body-sm text-text-muted">
          {waiting && (
            <>
              <CloudOff className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{text.offline}</span>
            </>
          )}
          {!waiting && save === "saving" && (
            <>
              <Loader2 className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
              {text.saving}
            </>
          )}
          {!waiting && save === "saved" && (
            <>
              <Check className="size-4 shrink-0 text-success" strokeWidth={3} aria-hidden="true" />
              {text.saved}
            </>
          )}
        </p>
      </div>

      <h1 className="mt-2 text-h2 text-balance text-text sm:text-h1">{text.title}</h1>
      {card && (
        <p className="mt-2 text-body text-pretty text-text-muted tabular-nums">
          {[card.name || tripsText.card.untitled, ...facts].join(" · ")}
        </p>
      )}

      {!plan && state === "loading" && (
        <div role="status" className="mt-8 space-y-6 motion-safe:animate-pulse">
          <span className="sr-only">{text.loading}</span>
          <div className="h-32 rounded-2xl bg-surface-muted" />
          <div className="h-96 rounded-2xl border border-border bg-surface" />
        </div>
      )}

      {!plan && state === "failed" && (
        <div className="mt-6">
          <ErrorAlert message={online ? text.error : text.offlineUnavailable} retryLabel={text.retry} onRetry={retryLoad} />
        </div>
      )}

      {!plan && state === "notFound" && <p className="mt-6 text-body text-pretty text-text-muted">{text.notFound}</p>}

      {plan && card && !ready && (
        <div className="mt-8 rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center">
          <p className="mx-auto max-w-md text-body-sm text-pretty text-text-muted">{text.notReady}</p>
          <Link href={tripHref(card)} className={`${OUTLINE_BUTTON} mt-6`}>
            {tripsText.card.continue}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      {plan && ready && (
        <div className="mt-8 motion-safe:animate-message-in">
          {save === "failed" && online && (
            <div className="mb-6">
              <ErrorAlert message={text.saveFailed} retryLabel={text.retry} onRetry={saveNow} />
            </div>
          )}
          <PackingBoard
            draft={plan.draft}
            itinerary={plan.itinerary}
            itineraryHref={`/trips/${encodeURIComponent(tripId)}`}
            laundrySync={laundrySync}
            text={text}
            planText={planText}
            onChange={change}
            onLaundryRetry={findLaundry}
          />
        </div>
      )}
    </main>
  );
}
