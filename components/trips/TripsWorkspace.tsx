"use client";

import { Plus, WifiOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ErrorAlert from "@/components/plan/ErrorAlert";
import { PRIMARY_BUTTON } from "@/components/plan/styles";
import { trips } from "@/lib/api/trips";
import { fillTemplate } from "@/lib/plan-draft";
import type { ActiveTrips, HistoryTrips, TripCard as TripCardData } from "@/lib/trips/trip";
import { useMessages } from "@/lib/use-messages";
import { useOnline } from "@/lib/use-online";
import DeleteDialog from "./DeleteDialog";
import HistoryTools from "./HistoryTools";
import OngoingCard from "./OngoingCard";
import TripCard from "./TripCard";
import type { TripActions } from "./TripMenu";
import TripsEmpty from "./TripsEmpty";
import TripsNotice, { type Notice } from "./TripsNotice";
import TripsSkeleton from "./TripsSkeleton";
import TripTabs, { type TripTab, TRIPS_PANEL_ID, tripTabId } from "./TripTabs";

type TripsWorkspaceProps = {
  initialTab: TripTab;
};

type DeleteState = "idle" | "pending" | "failed";

const PLAN_HREF = "/plan";
const SEARCH_DELAY_MS = 250;
const NOTICE_MS = 5000;
const GRID = "grid gap-4 md:grid-cols-2 lg:grid-cols-3";
const SECTION_TITLE = "mb-4 text-h3 text-text";

export default function TripsWorkspace({ initialTab }: TripsWorkspaceProps) {
  const text = useMessages("trips");
  const travel = useMessages("travel");
  const online = useOnline();
  const [tab, setTab] = useState<TripTab>(initialTab);
  const [activeTrips, setActiveTrips] = useState<ActiveTrips | null>(null);
  const [historyTrips, setHistoryTrips] = useState<HistoryTrips | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [failedTab, setFailedTab] = useState<TripTab | null>(null);
  const [reloads, setReloads] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<TripCardData | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>("idle");
  const [notice, setNotice] = useState<Notice | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const noticeIdRef = useRef(0);
  const arrivingIdRef = useRef<string | null>(null);
  const deletedRef = useRef(false);

  useEffect(() => {
    if (tab !== "active") return;
    const controller = new AbortController();
    trips.active(controller.signal).then(setActiveTrips, () => {
      if (!controller.signal.aborted) setFailedTab("active");
    });
    return () => controller.abort();
  }, [tab, reloads]);

  useEffect(() => {
    if (tab !== "history") return;
    const controller = new AbortController();
    trips.history({ query: search, year }, controller.signal).then(setHistoryTrips, () => {
      if (!controller.signal.aborted) setFailedTab("history");
    });
    return () => controller.abort();
  }, [tab, search, year, reloads]);

  // The list is only asked for again once typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  // A draft made by "duplicate" is brought into view and focused once it is on screen.
  useEffect(() => {
    if (tab !== "active" || !arrivingIdRef.current) return;
    const card = document.getElementById(`trip-${arrivingIdRef.current}`);
    if (!card) return;
    arrivingIdRef.current = null;
    card.scrollIntoView({ block: "center" });
    card.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
  }, [tab, activeTrips]);

  // Runs after the dialog has closed and given focus back, so the heading keeps it:
  // the card that opened the dialog no longer exists.
  useEffect(() => {
    if (deleteTarget || !deletedRef.current) return;
    deletedRef.current = false;
    headingRef.current?.focus();
  }, [deleteTarget]);

  const announce = (tone: Notice["tone"], message: string) => {
    noticeIdRef.current += 1;
    setNotice({ id: noticeIdRef.current, tone, message });
  };

  const changeTab = (next: TripTab) => {
    if (next === tab) return;
    setTab(next);
    setFailedTab(null);
    window.history.replaceState(null, "", next === "history" ? "/trips?tab=history" : "/trips");
  };

  const retry = () => {
    setFailedTab(null);
    setReloads((count) => count + 1);
  };

  const clearFilters = () => {
    setQuery("");
    setSearch("");
    setYear(null);
  };

  const nameOf = (card: TripCardData) => card.name || text.card.untitled;

  const duplicate = async (card: TripCardData) => {
    const name = nameOf(card);
    try {
      const copy = await trips.duplicate(card.id, fillTemplate(text.copyName, { name }));
      arrivingIdRef.current = copy.id;
      setActiveTrips((current) => current && { ...current, drafts: [copy, ...current.drafts] });
      changeTab("active");
      announce("success", fillTemplate(text.notice.duplicated, { name }));
    } catch {
      announce("error", text.notice.duplicateFailed);
    }
  };

  const share = async (card: TripCardData) => {
    const url = `${window.location.origin}/trips/${encodeURIComponent(card.id)}`;
    if (typeof navigator.share === "function") {
      // Closing the share sheet rejects too; that is not a failure worth reporting.
      navigator.share({ title: nameOf(card), url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      announce("success", text.notice.copied);
    } catch {
      announce("error", text.notice.shareFailed);
    }
  };

  const askDelete = (card: TripCardData) => {
    setDeleteState("idle");
    setDeleteTarget(card);
  };

  const cancelDelete = () => {
    if (deleteState === "pending") return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    const keep = (card: TripCardData) => card.id !== id;
    setDeleteState("pending");
    try {
      await trips.remove(id);
    } catch {
      setDeleteState("failed");
      return;
    }
    setActiveTrips(
      (current) =>
        current && {
          ongoing: current.ongoing.filter(keep),
          upcoming: current.upcoming.filter(keep),
          drafts: current.drafts.filter(keep),
        },
    );
    setHistoryTrips((current) => current && { ...current, trips: current.trips.filter(keep) });
    // The history totals and year list come from the server, so they are read again.
    setReloads((count) => count + 1);
    deletedRef.current = true;
    setDeleteState("idle");
    setDeleteTarget(null);
    announce("success", fillTemplate(text.notice.deleted, { name: nameOf(deleteTarget) }));
  };

  const actions: TripActions = { onDuplicate: duplicate, onShare: share, onDelete: askDelete };
  const filtering = query.trim() !== "" || year !== null;
  const activeEmpty =
    activeTrips !== null &&
    activeTrips.ongoing.length + activeTrips.upcoming.length + activeTrips.drafts.length === 0;
  const loading = failedTab !== tab && (tab === "active" ? activeTrips === null : historyTrips === null);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 lg:max-w-5xl xl:px-0">
      <header className="flex flex-wrap items-center justify-between gap-4 motion-safe:animate-message-in">
        <h1 ref={headingRef} tabIndex={-1} className="text-h2 text-text outline-none sm:text-h1">
          {text.title}
        </h1>
        <Link href={PLAN_HREF} className={`${PRIMARY_BUTTON} w-full sm:w-auto`}>
          <Plus className="size-4" aria-hidden="true" />
          {text.plan}
        </Link>
      </header>

      <div className="mt-6 motion-safe:animate-message-in motion-safe:[animation-delay:40ms]">
        <TripTabs tab={tab} text={text.tabs} onChange={changeTab} />
      </div>

      {!online && (
        <p
          role="status"
          className="mt-6 flex items-center gap-3 rounded-2xl bg-warning-subtle px-4 py-3 text-body-sm text-on-warning-subtle motion-safe:animate-message-in"
        >
          <WifiOff className="size-5 shrink-0" aria-hidden="true" />
          {text.offline}
        </p>
      )}

      <div id={TRIPS_PANEL_ID} role="tabpanel" aria-labelledby={tripTabId(tab)} aria-busy={loading} className="mt-8">
        {failedTab === tab && <ErrorAlert message={text.error} retryLabel={text.retry} onRetry={retry} />}
        {loading && <TripsSkeleton label={text.loading} />}

        {tab === "active" && activeTrips !== null && failedTab !== "active" && (
          <div className="flex flex-col gap-12">
            {activeEmpty && <TripsEmpty kind="active" text={text} planHref={PLAN_HREF} onClear={clearFilters} />}

            {activeTrips.ongoing.length > 0 && (
              <section aria-labelledby="trips-ongoing">
                <h2 id="trips-ongoing" className="sr-only">
                  {text.sections.ongoing}
                </h2>
                <div className="flex flex-col gap-6">
                  {activeTrips.ongoing.map((card) => (
                    <OngoingCard key={card.id} card={card} text={text} actions={actions} />
                  ))}
                </div>
              </section>
            )}

            {activeTrips.upcoming.length > 0 && (
              <section aria-labelledby="trips-upcoming">
                <h2 id="trips-upcoming" className={SECTION_TITLE}>
                  {text.sections.upcoming}
                </h2>
                <div className={GRID}>
                  {activeTrips.upcoming.map((card, index) => (
                    <TripCard key={card.id} card={card} text={text} index={index} actions={actions} />
                  ))}
                </div>
              </section>
            )}

            {activeTrips.drafts.length > 0 && (
              <section aria-labelledby="trips-drafts">
                <h2 id="trips-drafts" className={SECTION_TITLE}>
                  {text.sections.drafts}
                </h2>
                <div className={GRID}>
                  {activeTrips.drafts.map((card, index) => (
                    <TripCard key={card.id} card={card} text={text} index={index} actions={actions} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {tab === "history" && historyTrips !== null && failedTab !== "history" && (
          <>
            {historyTrips.total === 0 && (
              <TripsEmpty kind="history" text={text} planHref={PLAN_HREF} onClear={clearFilters} />
            )}
            {historyTrips.total > 0 && (
              <div className="flex flex-col gap-8">
                <HistoryTools
                  text={text.history}
                  mapLabel={travel.open}
                  total={historyTrips.total}
                  countries={historyTrips.countries}
                  years={historyTrips.years}
                  query={query}
                  year={year}
                  onQueryChange={setQuery}
                  onYearChange={setYear}
                />
                {historyTrips.trips.length === 0 && filtering && (
                  <TripsEmpty kind="search" text={text} planHref={PLAN_HREF} onClear={clearFilters} />
                )}
                {historyTrips.trips.length > 0 && (
                  <div className={GRID}>
                    {historyTrips.trips.map((card, index) => (
                      <TripCard key={card.id} card={card} text={text} index={index} actions={actions} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <DeleteDialog
        name={deleteTarget ? nameOf(deleteTarget) : null}
        text={text.delete}
        pending={deleteState === "pending"}
        failed={deleteState === "failed"}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
      <TripsNotice notice={notice} dismissLabel={text.notice.dismiss} onDismiss={() => setNotice(null)} />
    </div>
  );
}
