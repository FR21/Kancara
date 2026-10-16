"use client";

import { ChevronRight, CloudOff, IdCard, Link2, MessageCircle, Phone, PhoneOff, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Notice, { type NoticeMessage } from "@/components/layout/Notice";
import PageBackdrop from "@/components/layout/PageBackdrop";
import PageHeader from "@/components/layout/PageHeader";
import PageShell from "@/components/layout/PageShell";
import ErrorAlert from "@/components/ui/ErrorAlert";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { BADGE, TEXT_LINK, choiceClass, iconButtonClass } from "@/components/ui/styles";
import {
  type Door,
  applyLocally,
  canQueue,
  fetchPack,
  flushQueue,
  forgetKeptLink,
  queueAction,
  readKeptOrigin,
  readKeptPack,
  readQueue,
  readSeenReports,
  SafetyError,
  sendAction,
} from "@/lib/client/safety";
import { fillTemplate } from "@/lib/plan-draft";
import type { SafetyAction } from "@/lib/safety/action";
import { formatPhone, whatsAppLink } from "@/lib/safety/contact";
import { type SafetyMember, type SafetyPack, type SafetyReport, openReportFor } from "@/lib/safety/safety-pack";
import { useLocalNow } from "@/lib/safety/use-local-now";
import { useMessages } from "@/lib/use-messages";
import { useOnline } from "@/lib/use-online";
import CallPrompt, { CallLink } from "./CallLink";
import CardSheet from "./CardSheet";
import GuidePanel from "./GuidePanel";
import { type ActOutcome, type HelpContext, nameIn, searchMessage } from "@/components/safety/help-context";
import { BlockHeading, HELP_FRAME } from "./HelpBlock";
import MemberSheet, { SearchSteps } from "./MemberSheet";
import SeparatedButton from "./SeparatedButton";
import { ImportantNumbers, PrepareBlocks } from "./SetupColumn";
import StandaloneShell from "./StandaloneShell";

type HelpWorkspaceProps = {
  /** How this phone reaches the trip: an account on it, or one member's own link. */
  door: Door;
  /** Opens a member's sheet, for an alert about them elsewhere in the app. */
  startWithMember?: string;
};

type LoadState = "loading" | "failed" | "notFound";
type OpenSheet = { kind: "member" | "card"; memberId: string } | null;

// A search changes on other people's phones, so the pack is asked for again this often while the page is in view.
const REFRESH_MS = 8000;
// A search that ended longer ago than this is old news and is not announced.
const FOUND_NOTICE_MS = 15 * 60 * 1000;
// How long the line saying someone was found stays up before it leaves by itself.
const FOUND_SHOWN_MS = 6000;
// The chat and call links on a member's row. They sit on a row that is itself pressable, so they take the
// primary tint on hover, where the row takes the grey one, and read as targets of their own.
const ROW_LINK = `relative z-10 ${iconButtonClass("primaryQuiet")}`;
/** A line that tells the visitor something: a tinted box at the inner corner, on the page or inside a surface. */
const PAGE_NOTE = "flex items-start gap-3 rounded-lg px-4 py-3 text-body-sm text-pretty";
const subscribeToNothing = () => () => {};

/** A pack with the actions still waiting on this phone applied, so the screen shows what the visitor did. */
function withWaiting(door: Door, pack: SafetyPack): SafetyPack {
  return readQueue(door).reduce(applyLocally, pack);
}

function RollRow({ context, member, index, onOpen }: { context: HelpContext; member: SafetyMember; index: number; onOpen: () => void }) {
  const { pack, text } = context;
  const copy = text.roll;
  const name = nameIn(context, member);
  const isViewer = member.id === pack.viewerMemberId;
  const searching = openReportFor(pack, member.id) !== null;
  const reachable = member.hasPhone && member.phone !== null && !isViewer;

  const reach = () => {
    if (!member.hasPhone) {
      return { Icon: member.cardSavedAt ? IdCard : PhoneOff, label: `${copy.noPhone}, ${member.cardSavedAt ? copy.cardSaved : copy.cardMissing}`, warn: !member.cardSavedAt };
    }
    // The number itself is shown: it is what someone reads out, or dials from another phone.
    if (member.phone !== null) return { Icon: Phone, label: formatPhone(member.phone), warn: false };
    if (member.joined) return { Icon: Link2, label: copy.joined, warn: false };
    return { Icon: TriangleAlert, label: copy.noNumber, warn: true };
  };
  const { Icon, label, warn } = reach();

  return (
    <li
      style={{ "--item-index": index } as CSSProperties}
      className="relative flex items-center gap-1 pr-surface transition-[background-color] duration-150 ease-out hover:bg-surface-muted motion-safe:animate-list-in"
    >
      {/* The button's ::after covers the row, so the whole row opens the member; the two links sit above it. */}
      <button
        type="button"
        aria-label={fillTemplate(copy.open, { name })}
        onClick={onOpen}
        className="flex min-h-16 min-w-0 flex-1 cursor-pointer items-center gap-3 py-3 pr-2 pl-surface text-left -outline-offset-2 after:absolute after:inset-0"
      >
        <MemberAvatar ageGroup={member.ageGroup} variant={index} className="size-10 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 text-label-lg text-pretty wrap-anywhere text-text">{name}</span>
            {isViewer && (
              <span className="inline-flex h-5 items-center rounded-full border border-primary px-2 text-[11px] font-semibold text-primary sm:h-6 sm:px-2.5 sm:text-caption">
                {copy.you}
              </span>
            )}
            {searching && (
              <span className={`${BADGE} bg-primary-subtle text-on-primary-subtle`}>
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent motion-safe:animate-signal" />
                {isViewer ? copy.asked : copy.searching}
              </span>
            )}
          </span>
          <span className={`mt-1 flex items-center gap-2 text-caption tabular-nums ${warn ? "text-warning" : "text-text-muted"}`}>
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
          </span>
        </span>
      </button>
      {reachable && member.phone && (
        <>
          <a
            href={whatsAppLink(member.phone, searching ? searchMessage(context, member) : "")}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={fillTemplate(copy.chat, { name })}
            title={fillTemplate(copy.chat, { name })}
            className={ROW_LINK}
          >
            <MessageCircle className="size-5" aria-hidden="true" />
          </a>
          <CallLink
            phone={member.phone}
            name={name}
            aria-label={fillTemplate(copy.call, { name })}
            title={fillTemplate(copy.call, { name })}
            className={ROW_LINK}
          >
            <Phone className="size-5" aria-hidden="true" />
          </CallLink>
        </>
      )}
      <ChevronRight className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
    </li>
  );
}

/** The page while the pack is on its way: the guide and the group, as blocks the shape of what arrives. */
function HelpSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="mt-8 space-y-8 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8 lg:space-y-0">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-8">
        <div className="rounded-surface border border-border bg-surface p-surface motion-safe:animate-pulse">
          <div className="h-6 w-32 rounded-lg bg-surface-muted" />
          <div className="mt-4 h-8 w-3/4 rounded-lg bg-surface-muted" />
          <div className="mt-6 h-12 rounded-full bg-surface-muted" />
          <div className="mt-3 h-14 rounded-full bg-surface-muted" />
        </div>
        <div className="rounded-surface border border-border bg-surface p-surface motion-safe:animate-pulse">
          <div className="h-6 w-28 rounded-lg bg-surface-muted" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="mt-4 flex items-center gap-3">
              <div className="size-10 shrink-0 rounded-full bg-surface-muted" />
              <div className="h-5 flex-1 rounded-lg bg-surface-muted" />
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="h-64 rounded-surface border border-border bg-surface p-surface motion-safe:animate-pulse">
        <div className="h-6 w-36 rounded-lg bg-surface-muted" />
        <div className="mt-4 h-5 rounded-lg bg-surface-muted" />
        <div className="mt-3 h-5 w-2/3 rounded-lg bg-surface-muted" />
      </div>
    </div>
  );
}

// The help page of one trip, opened by every member. The way back to the group is on the page itself: where the
// group gathers, one button that calls the leader, the group with each number and its chat, and the numbers that
// matter. Nothing is sent by opening it. The group is told only when "I am separated" is pressed, an action that
// never moves. The page shows the pack kept on the phone first and keeps working from it without a connection;
// what is done offline waits and is sent once a connection is back. A member with no account opens the same page
// through their own link: it greets them by name, carries none of the site's navigation, and leaves the setup to
// those who manage the trip.
export default function HelpWorkspace({ door, startWithMember }: HelpWorkspaceProps) {
  const linked = door.kind === "link";
  // The two fields of a door, so effects follow the door itself and not the object a parent rebuilt.
  const doorKey = door.kind === "trip" ? door.tripId : door.token;
  const router = useRouter();
  // The group's link this member was picked through on this phone, when they were: the way back to pick again.
  const groupToken = useSyncExternalStore(
    subscribeToNothing,
    () => (door.kind === "link" ? readKeptOrigin(door.token) : null),
    () => null,
  );
  const text = useMessages("safety");
  const planText = useMessages("plan");
  const navText = useMessages("navbar");
  const online = useOnline();
  const clock = useLocalNow();
  const [pack, setPack] = useState<SafetyPack | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [notice, setNotice] = useState("");
  const [foundNotice, setFoundNotice] = useState<NoticeMessage | null>(null);
  const [reloads, setReloads] = useState(0);
  const startedRef = useRef(false);
  const whoRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const ageLabels = planText.ageGroups;

  /**
   * Takes a pack in, and says once, in a line that leaves by itself, who was found since this phone last looked.
   * The searches already announced are remembered on the phone, so a line never comes back or piles up.
   */
  const takePack = (next: SafetyPack) => {
    setPack(next);
    const seen = readSeenReports(door);
    const fresh = next.reports.filter(
      (report) => report.status === "FOUND" && !seen.has(report.id) && Date.parse(next.fetchedAt) - Date.parse(report.updatedAt) < FOUND_NOTICE_MS,
    );
    if (fresh.length === 0) return;
    seen.mark(fresh.map((report) => report.id));
    const found = next.members.filter((entry) => fresh.some((report) => report.missingMemberId === entry.id));
    const names = found.map((entry) => {
      const unnamed = next.members.filter((other) => other.ageGroup === entry.ageGroup && other.name.trim() === "");
      return entry.name.trim() || `${ageLabels[entry.ageGroup]} ${unnamed.indexOf(entry) + 1}`;
    });
    if (names.length > 0) setFoundNotice({ id: Date.now(), tone: "success", message: fillTemplate(text.search.found, { name: names.join(", ") }) });
  };

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const kept = readKeptPack(door);
      if (kept) setPack((current) => current ?? withWaiting(door, kept));
      try {
        await flushQueue(door);
        const fresh = await fetchPack(door, controller.signal);
        if (!controller.signal.aborted) takePack(withWaiting(door, fresh));
      } catch (caught) {
        if (controller.signal.aborted) return;
        setState(caught instanceof SafetyError && caught.status === 404 ? "notFound" : "failed");
      }
    };
    const refresh = () => {
      if (document.visibilityState === "visible" && navigator.onLine) load();
    };
    load();
    const timer = setInterval(refresh, REFRESH_MS);
    window.addEventListener("online", refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("online", refresh);
    };
    // The door is the same for as long as its kind and key are; a pack is taken in the same way on every round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [door.kind, doorKey, reloads]);

  const act = async (action: SafetyAction): Promise<ActOutcome> => {
    const later = (): ActOutcome => {
      queueAction(door, action);
      setPack((current) => current && applyLocally(current, action));
      return "queued";
    };
    if (!navigator.onLine) return canQueue(action) ? later() : "offline";
    try {
      takePack(withWaiting(door, await sendAction(door, action)));
      return "done";
    } catch (caught) {
      const status = caught instanceof SafetyError ? caught.status : 0;
      if (status === 409) return "taken";
      if (status === 400) return "invalid";
      return canQueue(action) && (status === 0 || status >= 500) ? later() : "failed";
    }
  };

  // The one action: it tells the group the viewer is separated, and once it has, that they are back.
  const pressAction = (current: SafetyPack) => {
    const memberId = current.viewerMemberId;
    if (!memberId) {
      setNotice(text.sos.needWho);
      whoRef.current?.scrollIntoView({ block: "center" });
      return;
    }
    setNotice("");
    if (openReportFor(current, memberId)) act({ type: "status", memberId, status: "FOUND" });
    else {
      act({ type: "report", memberId });
      guideRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  };

  // An alert elsewhere in the app can ask for one member; it is honoured once, when the pack is in.
  useEffect(() => {
    if (!pack || startedRef.current) return;
    startedRef.current = true;
    if (!startWithMember || startWithMember === pack.viewerMemberId || !pack.members.some((member) => member.id === startWithMember)) return;
    const opening = setTimeout(() => setSheet({ kind: "member", memberId: startWithMember }), 0);
    return () => clearTimeout(opening);
    // The request is read once, against the first pack to arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack === null]);

  const retry = () => {
    setState("loading");
    setReloads((count) => count + 1);
  };

  const context: HelpContext | null = pack
    ? { pack, text, ageLabels, clock, online, origin: typeof window === "undefined" ? "" : window.location.origin, act }
    : null;
  const member = (id: string) => pack?.members.find((entry) => entry.id === id) ?? null;
  const viewer = pack?.viewerMemberId ? member(pack.viewerMemberId) : null;
  const asked = pack?.viewerMemberId ? openReportFor(pack, pack.viewerMemberId) !== null : false;
  const actionLabel = asked ? text.sos.back : text.sos.button;
  // The viewer's own search is told in the guide at the head of the page; these are the searches for everyone else.
  const others = pack?.reports.filter((report) => report.status !== "FOUND" && report.missingMemberId !== pack.viewerMemberId) ?? [];

  const bandText = (report: SafetyReport, name: string) => {
    if (report.source === "FINDER") return fillTemplate(text.search.bandFinder, { name });
    if (report.source === "SOS") return fillTemplate(text.search.bandSos, { name });
    return fillTemplate(text.search.band, { name });
  };

  const greeting = linked && context && viewer ? fillTemplate(text.link.hello, { name: nameIn(context, viewer) }) : text.title;
  const lead = () => {
    if (linked) return text.link.lead;
    return pack ? `${pack.tripName} · ${text.lead}` : text.lead;
  };

  const body = (
    <>
      <PageHeader
        crumbs={
          door.kind === "trip"
            ? {
                label: navText.breadcrumb,
                items: [
                  { label: navText.links.trips, href: "/trips" },
                  { label: pack?.tripName || text.back, href: `/trips/${encodeURIComponent(door.tripId)}` },
                  { label: text.title },
                ],
              }
            : undefined
        }
        title={greeting}
        lead={lead()}
      />
      {linked && pack && <p className="mt-2 text-body-sm text-pretty text-text-muted">{fillTemplate(text.link.keep, { trip: pack.tripName })}</p>}
      {/* A name picked by mistake would send every request for help under the wrong person, so it can be undone. */}
      {linked && groupToken && context && viewer && (
        <button
          type="button"
          onClick={() => {
            forgetKeptLink(groupToken);
            router.push(`/join/${groupToken}`);
          }}
          className={`${TEXT_LINK} mt-1 self-start`}
        >
          {fillTemplate(text.link.notYou, { name: nameIn(context, viewer) })}
        </button>
      )}
      {/* On a row of its own and in full: it is what tells a member that their request will still be sent. */}
      {!online && (
        <p role="status" className={`${PAGE_NOTE} mt-8 bg-surface-muted text-text motion-safe:animate-message-in`}>
          <CloudOff className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
          {text.offline}
        </p>
      )}

      {!pack && state === "loading" && <HelpSkeleton label={text.loading} />}
      {!pack && state === "failed" && (
        <div className="mt-8">
          <ErrorAlert message={text.error} retryLabel={text.retry} onRetry={retry} />
        </div>
      )}
      {!pack && state === "notFound" && <p className="mt-8 text-body text-pretty text-text-muted">{linked ? text.link.notFound : text.notFound}</p>}

      {pack && context && (
        <div className="mt-8 space-y-8 motion-safe:animate-message-in lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8 lg:space-y-0">
          <div className="min-w-0 space-y-8 lg:col-start-1">
            {others.map((report) => {
              const missing = member(report.missingMemberId);
              if (!missing) return null;
              return (
                <div key={report.id} className="rounded-surface bg-primary-subtle p-surface text-on-primary-subtle motion-safe:animate-pop-in">
                  <button
                    type="button"
                    onClick={() => setSheet({ kind: "member", memberId: missing.id })}
                    className="group/band flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg text-left transition-[scale] duration-150 ease-out active:scale-[0.99]"
                  >
                    <span aria-hidden="true" className="size-3 shrink-0 rounded-full bg-accent motion-safe:animate-signal" />
                    <span className="min-w-0 flex-1 text-label-lg text-pretty">{bandText(report, nameIn(context, missing))}</span>
                    <span className="shrink-0 text-label underline underline-offset-4">{text.search.see}</span>
                    <ChevronRight className="size-4 shrink-0 transition-[translate] duration-200 ease-out group-hover/band:translate-x-1" aria-hidden="true" />
                  </button>
                  <div className="mt-4 border-t border-primary/15 pt-4">
                    <SearchSteps report={report} context={context} />
                  </div>
                </div>
              );
            })}

            {!pack.viewerMemberId && (
              <div ref={whoRef} className="scroll-mt-28 rounded-surface border border-primary bg-surface p-surface">
                <BlockHeading title={text.who.title} hint={text.who.hint} />
                <div className="mt-4 flex flex-wrap gap-2">
                  {pack.members.map((entry, index) => (
                    <button
                      key={entry.id}
                      type="button"
                      disabled={entry.joined}
                      onClick={async () => setNotice((await act({ type: "claim", memberId: entry.id })) === "taken" ? text.who.taken : "")}
                      style={{ "--item-index": index } as CSSProperties}
                      className={`${choiceClass(false)} disabled:cursor-not-allowed disabled:opacity-40 motion-safe:animate-list-in`}
                    >
                      <MemberAvatar ageGroup={entry.ageGroup} variant={index} className="-ml-2 size-6" />
                      {nameIn(context, entry)}
                    </button>
                  ))}
                </div>
                {/* Both things the notice can say are about picking a name, so it stands with the names. */}
                {notice && (
                  <p role="alert" className={`${PAGE_NOTE} mt-4 bg-warning-subtle text-on-warning-subtle motion-safe:animate-message-in`}>
                    <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
                    {notice}
                  </p>
                )}
              </div>
            )}

            <div ref={guideRef} className="scroll-mt-28">
              <GuidePanel
                context={context}
                actionLabel={actionLabel}
                onAction={() => pressAction(pack)}
                onOpenCard={(memberId) => setSheet({ kind: "card", memberId })}
              />
            </div>

            <section aria-labelledby="roll-title" className={`${HELP_FRAME} overflow-clip`}>
              <div className="p-surface">
                <BlockHeading id="roll-title" title={text.roll.title} hint={text.roll.tap} />
              </div>
              <ul className="divide-y divide-border">
                {pack.members.map((entry, index) => (
                  <RollRow key={entry.id} context={context} member={entry} index={index} onOpen={() => setSheet({ kind: "member", memberId: entry.id })} />
                ))}
              </ul>
            </section>
          </div>

          <div className="lg:sticky lg:top-28 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <ImportantNumbers context={context} />
          </div>

          {pack.canManage && (
            <div className="min-w-0 lg:col-start-1 lg:row-start-2">
              <PrepareBlocks context={context} />
            </div>
          )}
        </div>
      )}

      {/* The bar and the notice that someone was found are drawn straight into the page's body. Inside this page
          they would be fixed to whatever moves it (the entrance above) and painted under whatever comes after (the
          site's footer); a member scrolled to the end would lose the one action that must stay in reach. */}
      {pack && context && (
        <>
          {createPortal(
            <>
              {/* The bar covers the bottom of the screen, so the page is made that much longer: under the footer,
                  or under the page itself where a member's own link shows none. */}
              <div aria-hidden="true" className={`h-20 shrink-0 lg:hidden ${linked ? "" : "bg-footer"}`} />
              <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-4 pt-3 sm:px-6 lg:hidden">
                <SeparatedButton asked={asked} label={actionLabel} onPress={() => pressAction(pack)} />
              </div>
              <Notice notice={foundNotice} dismissLabel={text.close} duration={FOUND_SHOWN_MS} onDismiss={() => setFoundNotice(null)} />
            </>,
            document.body,
          )}

          <MemberSheet
            context={context}
            member={sheet?.kind === "member" ? member(sheet.memberId) : null}
            onClose={() => setSheet(null)}
            onOpenCard={(memberId) => setSheet({ kind: "card", memberId })}
          />
          <CardSheet context={context} member={sheet?.kind === "card" ? member(sheet.memberId) : null} onClose={() => setSheet(null)} />
          <CallPrompt text={text.call} closeLabel={text.close} />
        </>
      )}
    </>
  );

  return <HelpFrame linked={linked}>{body}</HelpFrame>;
}

/** The page's frame: the site's own for a trip opened from the app, the bare one for a member's own link. */
function HelpFrame({ linked, children }: { linked: boolean; children: ReactNode }) {
  if (linked) return <StandaloneShell width="workspace">{children}</StandaloneShell>;
  return (
    <PageShell width="workspace">
      <PageBackdrop />
      {children}
    </PageShell>
  );
}
