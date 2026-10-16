"use client";

import { Loader2, Plus, MousePointerClick } from "lucide-react";
import OfflineNote from "@/components/ui/OfflineNote";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ErrorAlert from "@/components/ui/ErrorAlert";
import { OUTLINE_BUTTON, buttonClass } from "@/components/ui/styles";
import { trips } from "@/lib/client/trips";
import { fillTemplate } from "@/lib/plan-draft";
import { formatTripTitle } from "@/lib/trips/format";
import { useLocale } from "@/lib/use-locale";
import type { ActiveTrips, HistoryTrips, TripCard } from "@/lib/trips/trip";
import { useMediaQuery } from "@/lib/use-media-query";
import { useMessages } from "@/lib/use-messages";
import { useOnline } from "@/lib/use-online";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import HistoryTools from "./HistoryTools";
import TripDetail, { type TripActions } from "./TripDetail";
import TripList, { type TripListSection, tripRowId } from "./TripList";
import TripSheet from "./TripSheet";
import TripsEmpty from "./TripsEmpty";
import Notice, { type NoticeMessage } from "@/components/layout/Notice";
import PageHeader from "@/components/layout/PageHeader";
import TripsSkeleton from "./TripsSkeleton";
import TripTabs, { type TripTab, TRIPS_PANEL_ID, tripTabId } from "./TripTabs";
import EmptyState from "@/components/ui/EmptyState";

type TripsWorkspaceProps = {
  initialTab: TripTab;
};

type DeleteState = "idle" | "pending" | "failed";

const PLAN_HREF = "/plan";
const DESKTOP_QUERY = "(min-width: 1024px)";
const SEARCH_DELAY_MS = 250;
const TITLE_ID = "trips-title";
const DETAIL_HEADING_ID = "trip-detail-title";
const SHEET_HEADING_ID = "trip-sheet-title";

export default function TripsWorkspace({ initialTab }: TripsWorkspaceProps) {
  const text = useMessages("trips");
  const travel = useMessages("travel");
  const needLabels = useMessages("plan").needs;
  const online = useOnline();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [tab, setTab] = useState<TripTab>(initialTab);
  const [activeTrips, setActiveTrips] = useState<ActiveTrips | null>(null);
  const [historyTrips, setHistoryTrips] = useState<HistoryTrips | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [failedTab, setFailedTab] = useState<TripTab | null>(null);
  const [reloads, setReloads] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<TripCard | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>("idle");
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
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

  // A draft made by "duplicate" is brought into view and focused once its row is on screen.
  useEffect(() => {
    if (tab !== "active" || !arrivingIdRef.current) return;
    const row = document.getElementById(tripRowId(arrivingIdRef.current));
    if (!row) return;
    arrivingIdRef.current = null;
    row.scrollIntoView({ block: "center" });
    row.focus({ preventScroll: true });
  }, [tab, activeTrips]);

  // Runs after the dialog has closed and given focus back, so the heading keeps it:
  // the trip that opened the dialog no longer exists.
  useEffect(() => {
    if (deleteTarget || !deletedRef.current) return;
    deletedRef.current = false;
    document.getElementById(TITLE_ID)?.focus();
  }, [deleteTarget]);

  const announce = (tone: NoticeMessage["tone"], message: string) => {
    noticeIdRef.current += 1;
    setNotice({ id: noticeIdRef.current, tone, message });
  };

  const changeTab = (next: TripTab) => {
    if (next === tab) return;
    setTab(next);
    setFailedTab(null);
    setSheetOpen(false);
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

  // Adds the next page to the list on screen. A trip that moved between pages meanwhile is not shown twice.
  const loadMore = async (offset: number) => {
    const fresh = (shown: TripCard[], more: TripCard[]) => [
      ...shown,
      ...more.filter((card) => !shown.some((known) => known.id === card.id)),
    ];
    setLoadingMore(true);
    try {
      const signal = new AbortController().signal;
      if (tab === "active") {
        const more = await trips.active(signal, offset);
        setActiveTrips(
          (current) =>
            current && {
              ongoing: fresh(current.ongoing, more.ongoing),
              upcoming: fresh(current.upcoming, more.upcoming),
              drafts: fresh(current.drafts, more.drafts),
              nextOffset: more.nextOffset,
            },
        );
      } else {
        const more = await trips.history({ query: search, year }, signal, offset);
        setHistoryTrips((current) => current && { ...more, trips: fresh(current.trips, more.trips) });
      }
    } catch {
      announce("error", text.error);
    } finally {
      setLoadingMore(false);
    }
  };

  const selectTrip = (card: TripCard) => {
    setSelectedId(card.id);
    setSheetOpen(true);
  };

  const locale = useLocale();
  const nameOf = (card: TripCard) => formatTripTitle(card.name, card.destinations, locale, text.card.untitled);

  const duplicate = async (card: TripCard) => {
    const name = nameOf(card);
    setSheetOpen(false);
    try {
      const copy = await trips.duplicate(card.id, fillTemplate(text.copyName, { name }));
      arrivingIdRef.current = copy.id;
      setSelectedId(copy.id);
      setActiveTrips((current) => current && { ...current, drafts: [copy, ...current.drafts] });
      changeTab("active");
      announce("success", fillTemplate(text.notice.duplicated, { name }));
    } catch {
      announce("error", text.notice.duplicateFailed);
    }
  };

  const share = async (card: TripCard) => {
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

  const askDelete = (card: TripCard) => {
    setSheetOpen(false);
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
    const keep = (card: TripCard) => card.id !== id;
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
          ...current,
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
  const loading = failedTab !== tab && (tab === "active" ? activeTrips === null : historyTrips === null);
  const ready = !loading && failedTab !== tab;

  const activeSections: TripListSection[] = activeTrips
    ? [
        { key: "ongoing", title: text.sections.ongoing, cards: activeTrips.ongoing },
        { key: "upcoming", title: text.sections.upcoming, cards: activeTrips.upcoming },
        { key: "drafts", title: text.sections.drafts, cards: activeTrips.drafts },
      ].filter((section) => section.cards.length > 0)
    : [];
  const historySections: TripListSection[] =
    historyTrips && historyTrips.trips.length > 0 ? [{ key: "history", title: null, cards: historyTrips.trips }] : [];
  const sections = tab === "active" ? activeSections : historySections;
  const cards = sections.flatMap((section) => section.cards);
  // Without a pick of the visitor's own, the panel shows the first trip: the one in progress when there is one.
  const selected = cards.find((card) => card.id === selectedId) ?? cards[0] ?? null;
  const nextOffset = (tab === "active" ? activeTrips?.nextOffset : historyTrips?.nextOffset) ?? null;
  const emptyKind = tab === "active" ? "active" : "history";
  const nothingYet = tab === "active" ? activeTrips !== null && cards.length === 0 : historyTrips?.total === 0;

  return (
    <div>
      <PageHeader
        title={text.title}
        titleId={TITLE_ID}
      />

      {/* The list's two views and a new plan share one row: what you are looking at on the left, starting another
          trip on the right. With no trips yet the empty state below carries the one "Plan" button instead. Quieter
          than opening the current trip, the screen's main action. */}
      <div className="mt-6 flex items-center justify-between gap-3 motion-safe:animate-message-in motion-safe:[animation-delay:40ms]">
        <TripTabs tab={tab} text={text.tabs} onChange={changeTab} />
        {!nothingYet && (
          <Link href={PLAN_HREF} className={`group ${buttonClass("outline", "small")} shrink-0`}>
            <Plus className="size-4 transition-[rotate] duration-300 ease-out group-hover:rotate-90" aria-hidden="true" />
            {text.plan}
          </Link>
        )}
      </div>

      {!online && (
        <div className="mt-6">
          <OfflineNote message={text.offline} />
        </div>
      )}

      <div key={tab} id={TRIPS_PANEL_ID} role="tabpanel" aria-labelledby={tripTabId(tab)} aria-busy={loading} className="mt-6 motion-safe:animate-message-in">
        {failedTab === tab && <ErrorAlert message={text.error} retryLabel={text.retry} onRetry={retry} />}
        {loading && <TripsSkeleton label={text.loading} />}

        {ready && nothingYet && <TripsEmpty kind={emptyKind} text={text} planHref={PLAN_HREF} onClear={clearFilters} />}

        {ready && !nothingYet && (
          <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-8">
            <div className="flex min-w-0 flex-col gap-4">
              {tab === "history" && historyTrips && (
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
              )}
              {cards.length === 0 && filtering && (
                <TripsEmpty kind="search" text={text} planHref={PLAN_HREF} onClear={clearFilters} />
              )}
              {cards.length > 0 && (
                <TripList sections={sections} selectedId={selected?.id ?? null} text={text} onSelect={selectTrip} />
              )}
              {cards.length > 0 && nextOffset !== null && (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => loadMore(nextOffset)}
                  className={`${OUTLINE_BUTTON} w-full`}
                >
                  {loadingMore && <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />}
                  {text.loadMore}
                </button>
              )}
            </div>

            <aside aria-label={text.detail.label} className="hidden lg:sticky lg:top-28 lg:block">
              {selected ? (
                <div key={selected.id} className="motion-safe:animate-message-in">
                  <TripDetail
                    card={selected}
                    text={text}
                    needLabels={needLabels}
                    actions={actions}
                    headingId={DETAIL_HEADING_ID}
                  />
                </div>
              ) : (
                <EmptyState icon={MousePointerClick} title={text.detail.emptyTitle} body={text.detail.empty} headingLevel={2} />
              )}
            </aside>
          </div>
        )}
      </div>

      <TripSheet
        open={sheetOpen && !isDesktop && selected !== null}
        labelledBy={SHEET_HEADING_ID}
        onClose={() => setSheetOpen(false)}
      >
        {selected && (
          <TripDetail
            card={selected}
            text={text}
            needLabels={needLabels}
            actions={actions}
            headingId={SHEET_HEADING_ID}
            onClose={() => setSheetOpen(false)}
          />
        )}
      </TripSheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={text.delete.title}
        body={fillTemplate(text.delete.body, { name: deleteTarget ? nameOf(deleteTarget) : "" })}
        cancelLabel={text.delete.cancel}
        confirmLabel={text.delete.confirm}
        pendingLabel={text.delete.pending}
        pending={deleteState === "pending"}
        error={deleteState === "failed" ? text.delete.failed : null}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
      <Notice notice={notice} dismissLabel={text.notice.dismiss} onDismiss={() => setNotice(null)} />
    </div>
  );
}
