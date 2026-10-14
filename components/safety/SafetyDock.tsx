"use client";

import { ChevronRight, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/styles";
import { type Alerts, type AlertSearch, fetchAlerts } from "@/lib/client/safety";
import { fillTemplate } from "@/lib/plan-draft";
import { useMessages } from "@/lib/use-messages";

// Push notifications are not wired yet, so a search reaches the rest of the group this way: every open Kancara
// page asks for the group's searches this often.
const POLL_MS = 8000;
// Where the SOS button rides along: the home page and a trip's own pages, as long as a trip is under way.
const SOS_PATHS = /^\/$|^\/trips(\/|$)/;
// Pages that are themselves the answer to an alert, or that a stranger sees.
const QUIET_PATHS = /^\/trips\/[^/]+\/help|^\/f\/|^\/join\/|^\/login|^\/register/;

// Mounted once in the root layout. While someone is signed in it shows, on whatever page they are, any search
// under way on their trips, and keeps the trip's help page one tap away during a trip. The button only opens that
// page: the group is told nothing until "I am separated" is pressed there.
export default function SafetyDock() {
  const pathname = usePathname();
  const text = useMessages("safety");
  const planText = useMessages("plan");
  const [state, setState] = useState<Alerts>({ signedIn: false, alerts: [] });
  const quiet = QUIET_PATHS.test(pathname);

  useEffect(() => {
    if (quiet) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      let signedIn = true;
      if (document.visibilityState === "visible" && navigator.onLine) {
        try {
          const next = await fetchAlerts(controller.signal);
          signedIn = next.signedIn;
          if (!controller.signal.aborted) setState(next);
        } catch {
          // A missed round is made up by the next one.
        }
      }
      // Someone signed out has no trips; asking again waits for the next page they open.
      if (!controller.signal.aborted && signedIn) timer = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [pathname, quiet]);

  if (quiet) return null;
  // The pill leads to the trip where the viewer already asked for help, when there is one.
  const ongoing =
    state.alerts.find((alert) => alert.ongoing && alert.searches.some((search) => search.forViewer)) ??
    state.alerts.find((alert) => alert.ongoing);
  // A member who pressed SOS already knows; the alert is for everyone else.
  const searches = state.alerts.flatMap((alert) =>
    alert.searches
      .filter((search) => !(search.forViewer && search.source === "SOS"))
      .map((search) => ({ tripId: alert.tripId, search })),
  );
  const nameOf = (search: AlertSearch) => search.name || `${planText.ageGroups[search.ageGroup]} ${search.order}`;
  const lineOf = (search: AlertSearch) => {
    if (search.forViewer && search.source !== "SOS") return text.dock.asking;
    const template = search.source === "FINDER" ? text.dock.finder : text.dock.searching;
    return fillTemplate(template, { name: nameOf(search) });
  };

  const showSos = ongoing !== undefined && SOS_PATHS.test(pathname);
  if (searches.length === 0 && !showSos) return null;

  // Everything the dock shows sits at the bottom edge, in thumb reach and clear of the page's title and controls.
  return (
    <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-end gap-2 px-4">
      {searches.length > 0 && (
        <ul role="status" aria-label={text.dock.label} className="flex w-full max-w-md flex-col gap-2">
          {searches.map(({ tripId, search }) => (
            <li key={`${tripId}-${search.memberId}`} className="motion-safe:animate-message-in">
              <Link
                href={`/trips/${encodeURIComponent(tripId)}/help?member=${encodeURIComponent(search.memberId)}`}
                className={`${buttonClass("primary")} group/alert pointer-events-auto w-full shadow-lg shadow-neutral-950/10`}
              >
                <span aria-hidden="true" className="size-3 shrink-0 rounded-full bg-accent motion-safe:animate-signal" />
                <span className="min-w-0 flex-1 truncate text-left">{lineOf(search)}</span>
                <span className="shrink-0 underline underline-offset-4">{text.dock.open}</span>
                <ChevronRight className="size-4 shrink-0 transition-[translate] duration-200 ease-out group-hover/alert:translate-x-1" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {showSos && (
        <Link
          href={`/trips/${encodeURIComponent(ongoing.tripId)}/help`}
          aria-label={text.dock.sosLabel}
          title={text.dock.sosLabel}
          className="pointer-events-auto relative inline-flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg shadow-neutral-950/10 transition-[background-color,scale] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97]"
        >
          <LifeBuoy className="size-6" aria-hidden="true" />
          {/* The signal dot rides on the button while the viewer's own search is open. */}
          {ongoing.searches.some((search) => search.forViewer) && (
            <span aria-hidden="true" className="absolute top-0 right-0 size-4 rounded-full border-2 border-background bg-accent motion-safe:animate-signal" />
          )}
        </Link>
      )}
    </div>
  );
}
