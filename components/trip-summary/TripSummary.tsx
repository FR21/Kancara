"use client";

import { MapPinOff, Plus, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import Notice, { type NoticeMessage } from "@/components/layout/Notice";
import PageBackdrop from "@/components/layout/PageBackdrop";
import PageHeader from "@/components/layout/PageHeader";
import PageShell from "@/components/layout/PageShell";
import MemoryAlbum from "@/components/trip-summary/MemoryAlbum";
import RouteRecap from "@/components/trip-summary/RouteRecap";
import { shareText } from "@/components/trip-summary/share-text";
import ShareSheet from "@/components/trip-summary/ShareSheet";
import SummaryStats, { type SummaryStat } from "@/components/trip-summary/SummaryStats";
import { useMemoryAlbum } from "@/components/trip-summary/use-memory-album";
import EmptyState from "@/components/ui/EmptyState";
import ErrorAlert from "@/components/ui/ErrorAlert";
import SegmentedToggle from "@/components/ui/SegmentedToggle";
import { buttonClass } from "@/components/ui/styles";
import { trips, TripsError } from "@/lib/client/trips";
import { fillTemplate } from "@/lib/plan-draft";
import { formatDays, formatMoney, formatTripDates, plural } from "@/lib/trips/format";
import type { TripPlanView } from "@/lib/trips/trip";
import { useLocale } from "@/lib/use-locale";
import { useMessages } from "@/lib/use-messages";

type LoadState = "loading" | "failed" | "notFound";
type SummaryView = "route" | "moments";

const VIEWS = ["route", "moments"] as const;

// Looking back on a trip: what it came to in numbers, the route the group took, and the album everyone in the
// group fills with photos and stories. The summary can be shared to the group's chat.
export default function TripSummary({ tripId }: { tripId: string }) {
  const text = useMessages("tripSummary");
  const tripsText = useMessages("trips");
  const navText = useMessages("navbar");
  const locale = useLocale();
  const album = useMemoryAlbum(tripId);
  const [plan, setPlan] = useState<TripPlanView | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [reloads, setReloads] = useState(0);
  const [view, setView] = useState<SummaryView>("route");
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    trips.plan(tripId, controller.signal).then(setPlan, (caught: unknown) => {
      if (controller.signal.aborted) return;
      setState(caught instanceof TripsError && caught.status === 404 ? "notFound" : "failed");
    });
    return () => controller.abort();
  }, [tripId, reloads]);

  const retryLoad = () => {
    setState("loading");
    setReloads((count) => count + 1);
  };

  const showNotice = (message: string) => setNotice({ id: Date.now(), tone: "success", message });

  const tripHref = `/trips/${encodeURIComponent(tripId)}`;
  const card = plan?.card;
  const name = card?.name || tripsText.card.untitled;
  const stops = plan?.itinerary?.days.flatMap((day) => day.items.filter((item) => !item.errand)) ?? [];
  const members = plan?.draft.members.map((member) => member.name.trim()).filter(Boolean) ?? [];
  const destination = card?.destinations.join(", ") ?? "";
  const dates = card?.startDate ? formatTripDates(card.startDate, card.endDate, locale) : "";
  const days = Math.max(card?.days ?? 0, plan?.itinerary?.days.length ?? 0, 1);
  const placesVisited = stops.length > 0 ? plural(text.stats.placesCount, stops.length, locale) : "";
  const crumbs = {
    label: navText.breadcrumb,
    items: [{ label: navText.links.trips, href: "/trips" }, ...(card ? [{ label: name, href: tripHref }] : []), { label: text.title }],
  };

  const stats: SummaryStat[] = [];
  if (stops.length > 0) stats.push({ label: text.stats.places, value: placesVisited });
  if (card && card.days > 0) stats.push({ label: text.stats.days, value: formatDays(card.days, locale) });
  if (card && card.memberCount > 0) {
    stats.push({ label: text.stats.members, value: plural(text.stats.membersCount, card.memberCount, locale) });
  }
  if (card?.cost && card.cost.spent > 0) {
    stats.push({ label: text.stats.spent, value: formatMoney(card.cost.spent, locale) });
  } else if (card?.budget) {
    stats.push({ label: text.stats.budget, value: formatMoney(card.budget, locale) });
  }

  const openShare = () => {
    setShareMessage(
      shareText(text.share.lines, {
        name,
        destination,
        dates,
        members,
        places: placesVisited,
        link: `${window.location.origin}${window.location.pathname}`,
      }),
    );
  };

  const viewLabels: Record<SummaryView, string> = {
    route: text.views.route,
    moments: album.total > 0 ? fillTemplate(text.views.momentsCount, { count: album.total }) : text.views.moments,
  };

  const place = [destination, dates].filter(Boolean).join(" · ");

  return (
    <PageShell width="workspace">
      <PageBackdrop />

      {!plan && state === "loading" && (
        <div>
          <Breadcrumbs label={crumbs.label} items={crumbs.items} />
          <span role="status" className="sr-only">
            {text.loading}
          </span>
          <div aria-hidden="true" className="mt-4 motion-safe:animate-pulse">
            <div className="h-9 w-3/4 rounded-lg bg-surface-muted sm:h-10" />
            <div className="mt-3 h-5 w-1/2 rounded-lg bg-surface-muted" />
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {["first", "second", "third", "fourth"].map((key, index) => (
                <div key={key} className={index > 1 ? "hidden sm:block" : ""}>
                  <div className="h-4 w-20 rounded-lg bg-surface-muted" />
                  <div className="mt-2 h-6 w-28 rounded-lg bg-surface-muted" />
                </div>
              ))}
            </div>
            <div className="mt-8 h-13 w-full rounded-full bg-surface-muted sm:w-64" />
            <div className="mt-6 h-72 rounded-surface bg-surface-muted" />
          </div>
        </div>
      )}

      {!plan && state === "failed" && (
        <>
          <PageHeader crumbs={crumbs} title={text.title} />
          <div className="mt-8 motion-safe:animate-message-in">
            <ErrorAlert message={text.error} retryLabel={text.retry} onRetry={retryLoad} />
          </div>
        </>
      )}

      {!plan && state === "notFound" && (
        <>
          <PageHeader crumbs={crumbs} title={text.title} />
          <EmptyState
            icon={MapPinOff}
            title={text.notFoundTitle}
            body={text.notFound}
            headingLevel={2}
            className="mt-8"
            action={
              <Link href="/trips" className={buttonClass("primary")}>
                {text.allTrips}
              </Link>
            }
          />
        </>
      )}

      {plan && card && (
        <>
          <PageHeader
            crumbs={crumbs}
            title={name}
            lead={place && <span className="tabular-nums">{place}</span>}
            actions={
              <>
                <button type="button" onClick={openShare} className={buttonClass("outline", "small")}>
                  <Share2 className="size-4" aria-hidden="true" />
                  {text.share.open}
                </button>
                {card.status === "completed" && (
                  <Link href="/plan" className={buttonClass("outline", "small")}>
                    <Plus className="size-4" aria-hidden="true" />
                    {text.nextTrip}
                  </Link>
                )}
              </>
            }
          />

          <SummaryStats stats={stats} text={text.stats} />

          <SegmentedToggle
            name="trip-summary-view"
            label={text.views.label}
            options={VIEWS}
            labels={viewLabels}
            value={view}
            onChange={setView}
            className="mt-8"
          />

          {/* Both views stay mounted, so the album keeps its pages and filter while the route is looked at. */}
          <section aria-label={text.views.route} hidden={view !== "route"} className="mt-6 motion-safe:animate-message-in">
            <RouteRecap itinerary={plan.itinerary} tripHref={tripHref} locale={locale} text={text} />
          </section>
          <section aria-label={text.views.moments} hidden={view !== "moments"} className="mt-6 motion-safe:animate-message-in">
            <MemoryAlbum
              album={album}
              days={days}
              defaultDay={Math.min(card.day ?? 1, days)}
              places={[...new Set(stops.map((stop) => stop.title))]}
              members={[...new Set(members)]}
              locale={locale}
              text={text}
              onNotice={showNotice}
            />
          </section>
        </>
      )}

      <ShareSheet message={shareMessage} text={text.share} onClose={() => setShareMessage(null)} />
      <Notice notice={notice} dismissLabel={text.dismiss} onDismiss={() => setNotice(null)} />
    </PageShell>
  );
}
