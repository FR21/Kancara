"use client";

import { Check, CloudOff, IdCard, LifeBuoy, LocateFixed, MapPin, MessageSquareText, Navigation2, Phone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { INPUT, OUTLINE_BUTTON, PRIMARY_BUTTON } from "@/components/plan/styles";
import { describePoint } from "@/lib/api/safety";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { MAX_LABEL_CHARS, MAX_NOTE_CHARS } from "@/lib/safety/action";
import { type Coordinates, bearingBetween, compassPoint, distanceBetween } from "@/lib/safety/contact";
import { mapsAvailable } from "@/lib/safety/google-map";
import { type SafetyMember, openReportFor } from "@/lib/safety/pack";
import { meetingPlace } from "@/lib/safety/plan-position";
import { useLocale } from "@/lib/use-locale";
import { CallLink } from "./CallLink";
import { type HelpContext, nameIn } from "./help";
import MapPeek from "./MapPeek";
import MeetingMap from "./MeetingMap";
import { SearchSteps } from "./MemberSheet";
import { BLOCK, FIELD_LABEL, Problem, SMALL_BUTTON, TEXT_ACTION } from "./SetupColumn";

type GuidePanelProps = {
  context: HelpContext;
  /** What the one action reads right now: "I am separated", or "I am back" once the group was told. */
  actionLabel: string;
  /** Tells the group, or tells it the member is back. */
  onAction: () => void;
  onOpenCard: (memberId: string) => void;
};

type Fix = Coordinates | "locating" | "off";
type ShareState = "idle" | "sharing" | "shared" | "failed";

const ANSWER =
  "flex min-h-14 flex-1 cursor-pointer items-center justify-center rounded-2xl border border-border-strong px-4 py-2 text-center text-label-lg text-text transition-[background-color,border-color,scale] duration-150 ease-out hover:border-primary hover:bg-primary-subtle active:scale-[0.97]";

function formatDistance(meters: number, locale: string, text: Messages["safety"]["sos"]): string {
  if (meters < 1000) return fillTemplate(text.meters, { value: Math.max(10, Math.round(meters / 10) * 10) });
  return fillTemplate(text.kilometers, { value: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(meters / 1000) });
}

const withNumber = (member: SafetyMember): member is SafetyMember & { phone: string } => member.hasPhone && member.phone !== null;

/** The form that names the meeting point and places it: on a map, or at the phone's own position where there is no map. */
function MeetingForm({ context, onDone }: { context: HelpContext; onDone: () => void }) {
  const locale = useLocale();
  const { pack, text } = context;
  const copy = text.meeting;
  const kept = pack.meetingPoint;
  const [label, setLabel] = useState(kept?.label ?? "");
  const [note, setNote] = useState(kept?.note ?? "");
  const [point, setPoint] = useState<Coordinates | "failed" | null>(null);
  const [mapShown, setMapShown] = useState(mapsAvailable && context.online);
  // The phone's own position once it was read, which the map is then brought to.
  const [mine, setMine] = useState<Coordinates | null>(null);
  const [failed, setFailed] = useState(false);
  const placed = typeof point === "object" && point !== null;
  // What the map last filled in. A field still holding it, or still empty, follows the pin; one the visitor
  // wrote in themselves is left alone.
  const filledRef = useRef({ label: "", note: "" });

  // True once a name or address on the form came from the lookup, which is then credited.
  const [looked, setLooked] = useState(false);

  const place = async (next: Coordinates) => {
    setPoint(next);
    const found = await describePoint(next, locale);
    if (!found) return;
    setLooked(true);
    const before = filledRef.current;
    filledRef.current = found;
    setLabel((current) => (current.trim() === "" || current === before.label ? found.label : current));
    setNote((current) => (current.trim() === "" || current === before.note ? found.note : current));
  };

  const readHere = () => {
    if (!("geolocation" in navigator)) return setPoint("failed");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const here = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        place(here);
        setMine(here);
      },
      () => setPoint("failed"),
      { enableHighAccuracy: true, timeout: 20_000 },
    );
  };
  const save = async (clear = false) => {
    // A map nobody moved says nothing, so the position the point already had is kept.
    const position = placed ? point : { latitude: kept?.latitude ?? null, longitude: kept?.longitude ?? null };
    const outcome = await context.act({ type: "meetingPoint", point: clear ? null : { label, note, ...position } });
    setFailed(outcome !== "done");
    if (outcome === "done") onDone();
  };

  return (
    <div className="mt-1 space-y-3">
      <div>
        <label htmlFor="meeting-name" className={FIELD_LABEL}>
          {copy.name}
        </label>
        <input
          id="meeting-name"
          type="text"
          autoComplete="off"
          maxLength={MAX_LABEL_CHARS}
          value={label}
          placeholder={copy.namePlaceholder}
          onChange={(event) => setLabel(event.target.value)}
          className={`${INPUT} mt-2`}
        />
      </div>
      <div>
        <label htmlFor="meeting-note" className={FIELD_LABEL}>
          {copy.note}
        </label>
        <input
          id="meeting-note"
          type="text"
          autoComplete="off"
          maxLength={MAX_NOTE_CHARS}
          value={note}
          placeholder={copy.notePlaceholder}
          onChange={(event) => setNote(event.target.value)}
          className={`${INPUT} mt-2`}
        />
      </div>
      <div>
        <p className={FIELD_LABEL}>{copy.where}</p>
        <div className="mt-2 space-y-3">
          {/* Two ways to say where: the phone's own position, read with one press, or the map slid under the pin.
              The first also brings the map there, so the second can fine-tune it. */}
          <button type="button" onClick={readHere} className={`${SMALL_BUTTON} w-full`}>
            <LocateFixed className="size-4 text-primary" aria-hidden="true" />
            {copy.here}
          </button>
          {mapShown && (
            <MeetingMap
              start={kept && kept.latitude !== null && kept.longitude !== null ? { latitude: kept.latitude, longitude: kept.longitude } : null}
              near={pack.destinations[0] ?? ""}
              moveTo={mine}
              text={copy}
              onMove={place}
              onUnavailable={() => setMapShown(false)}
            />
          )}
        </div>
        <p role="status" className={`mt-2 flex items-start gap-2 text-caption text-pretty ${placed ? "text-success" : "text-text-muted"}`}>
          {placed && <Check className="mt-px size-4 shrink-0" strokeWidth={3} aria-hidden="true" />}
          {point === "failed" ? copy.hereFailed : placed ? copy.placed : copy.hereHint}
        </p>
        {looked && <p className="mt-1 text-caption text-pretty text-text-muted">{copy.addressSource}</p>}
      </div>
      <Problem context={context} show={failed} />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={label.trim() === ""} onClick={() => save()} className={SMALL_BUTTON}>
          {text.save}
        </button>
        <button type="button" onClick={onDone} className={TEXT_ACTION}>
          {text.cancel}
        </button>
        {kept && (
          <button type="button" onClick={() => save(true)} className={TEXT_ACTION}>
            {copy.clear}
          </button>
        )}
      </div>
    </div>
  );
}

// The way back to the group, on the page itself: where the group gathers and which way that is, one button that
// calls the leader, and the one action that tells the group. Nothing here is sent by looking at it; the group is
// told only when "I am separated" is pressed, and the answers a separated member can give appear after that.
// It reads the pack kept on the phone, so all of it is there without a connection.
export default function GuidePanel({ context, actionLabel, onAction, onOpenCard }: GuidePanelProps) {
  const locale = useLocale();
  const { pack, text, clock } = context;
  const copy = text.sos;
  const [editing, setEditing] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const [asked, setAsked] = useState(false);
  const [fix, setFix] = useState<Fix>("locating");
  const [share, setShare] = useState<ShareState>("idle");
  const [heading, setHeading] = useState<number | null>(null);
  const viewer = pack.members.find((member) => member.id === pack.viewerMemberId) ?? null;
  const report = viewer ? openReportFor(pack, viewer.id) : null;
  const place = clock ? meetingPlace(pack, clock) : pack.meetingPoint;
  const target = place && place.latitude !== null && place.longitude !== null ? { latitude: place.latitude, longitude: place.longitude } : null;
  // The phone's position is read once the member is separated, or when they ask for the way; never just for opening the page.
  const guiding = target !== null && (report !== null || asked);
  const here = guiding && typeof fix === "object" ? fix : null;
  const lead = pack.members.find((member) => member.id === pack.leadMemberId);
  // The leader's number leads, as it does on the card.
  const callable = pack.members
    .filter(withNumber)
    .filter((member) => member.id !== viewer?.id)
    .sort((first, second) => Number(second.id === lead?.id) - Number(first.id === lead?.id));
  const first = callable[0];

  // The position stays on the phone, to point the way. It leaves only when "share" is pressed.
  useEffect(() => {
    if (!guiding) return;
    if (!("geolocation" in navigator)) {
      const unsupported = setTimeout(() => setFix("off"), 0);
      return () => clearTimeout(unsupported);
    }
    const watch = navigator.geolocation.watchPosition(
      (position) => setFix({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setFix("off"),
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [guiding]);

  // Which way the phone is held, where it says so. The arrow needs it: one drawn with north at the top would be
  // followed as if it pointed ahead, and send a lost person the wrong way.
  useEffect(() => {
    if (!guiding) return;
    const read = (event: DeviceOrientationEvent) => {
      const compass = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof compass === "number") setHeading(compass);
      else if (event.absolute && event.alpha !== null) setHeading(360 - event.alpha);
    };
    window.addEventListener("deviceorientationabsolute", read);
    window.addEventListener("deviceorientation", read);
    return () => {
      window.removeEventListener("deviceorientationabsolute", read);
      window.removeEventListener("deviceorientation", read);
    };
  }, [guiding]);

  const shareLocation = () => {
    if (!viewer) return;
    const send = async (point: Coordinates) => {
      const outcome = await context.act({ type: "location", memberId: viewer.id, ...point });
      setShare(outcome === "done" || outcome === "queued" ? "shared" : "failed");
    };
    setShare("sharing");
    if (here) send(here);
    else if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => send({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => setShare("failed"),
        { enableHighAccuracy: true, timeout: 20_000 },
      );
    } else setShare("failed");
  };

  const waiting = report?.id.startsWith("waiting:") ?? false;

  return (
    <section
      id="meeting-point"
      aria-label={copy.title}
      className="scroll-mt-28 divide-y divide-border overflow-clip rounded-2xl border border-border bg-surface"
    >
      {report && (
        <div role="status" className="bg-primary-subtle px-4 py-4 text-on-primary-subtle sm:px-5">
          <p className="flex items-start gap-3 text-label-lg text-pretty">
            {waiting ? (
              <CloudOff className="mt-1 size-5 shrink-0" aria-hidden="true" />
            ) : (
              <span aria-hidden="true" className="mt-2 size-3 shrink-0 rounded-full bg-accent motion-safe:animate-signal" />
            )}
            {waiting ? copy.queued : report.source === "SOS" ? copy.told : copy.asked}
          </p>
          <div className="mt-3 border-t border-primary/15 pt-3">
            <SearchSteps report={report} context={context} />
          </div>
        </div>
      )}

      <div className={BLOCK}>
        <div className="flex min-h-11 items-center justify-between gap-3">
          <h2 className="text-label text-text">{text.meeting.title}</h2>
          {!editing && pack.canManage && (
            <button type="button" onClick={() => setEditing(true)} className={TEXT_ACTION}>
              {pack.meetingPoint ? text.meeting.change : text.meeting.set}
            </button>
          )}
        </div>
        {editing && <MeetingForm context={context} onDone={() => setEditing(false)} />}
        {!editing && !place && <p className="text-body text-pretty text-text">{copy.meetNone}</p>}
        {!editing && place && (
          <>
            <div className="flex items-center gap-4">
              {target && here && heading !== null && (
                <span className="flex size-20 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                  <Navigation2
                    className="size-9 fill-primary text-primary transition-[rotate] duration-300 ease-out"
                    style={{ rotate: `${bearingBetween(here, target) - heading}deg` }}
                    aria-hidden="true"
                  />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-h3 text-pretty text-text">{place.label}</p>
                {place.note && <p className="mt-1 text-body-sm text-pretty text-text-muted">{place.note}</p>}
                {!pack.meetingPoint && <p className="mt-1 text-caption text-text-muted">{text.meeting.fromPlan}</p>}
                {guiding && target && (
                  <p role="status" className="mt-2 text-label text-primary tabular-nums">
                    {here &&
                      fillTemplate(copy.distance, {
                        distance: formatDistance(distanceBetween(here, target), locale, copy),
                        direction: copy.directions[compassPoint(bearingBetween(here, target))],
                      })}
                    {fix === "locating" && copy.locating}
                  </p>
                )}
                {guiding && fix === "off" && <p className="mt-2 text-caption text-pretty text-text-muted">{copy.locationOff}</p>}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setPeeking(true)} className={`${OUTLINE_BUTTON} min-w-0 flex-1`}>
                <MapPin className="size-4 text-primary" aria-hidden="true" />
                {copy.openMap}
              </button>
              {target && !guiding && (
                <button type="button" onClick={() => setAsked(true)} className={`${OUTLINE_BUTTON} min-w-0 flex-1`}>
                  <Navigation2 className="size-4 text-primary" aria-hidden="true" />
                  {copy.showWay}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className={`${BLOCK} space-y-3`}>
        {/* A call is the plainest way back at any age and needs no data connection, so it is always one tap away. */}
        {first ? (
          <CallLink phone={first.phone} name={nameIn(context, first)} className={`${PRIMARY_BUTTON} h-14 w-full`}>
            <Phone className="size-5" aria-hidden="true" />
            {fillTemplate(copy.callLead, { name: nameIn(context, first) })}
          </CallLink>
        ) : (
          !pack.secondaryPhone && <p className="text-body-sm text-pretty text-text-muted">{copy.noNumbers}</p>
        )}
        {/* The trip's second number answers when the leader's does not, and stands in for it until there is one. */}
        {pack.secondaryPhone && (
          <CallLink phone={pack.secondaryPhone} name={text.second.title} className={`${first ? OUTLINE_BUTTON : PRIMARY_BUTTON} h-14 w-full`}>
            <Phone className={`size-5 ${first ? "text-primary" : ""}`} aria-hidden="true" />
            {copy.callSecond}
          </CallLink>
        )}
        {/* The request is still on this phone. A text message needs no data connection either. */}
        {waiting && first && viewer && (
          <CallLink
            phone={first.phone}
            name={nameIn(context, first)}
            message={fillTemplate(copy.smsBody, { name: nameIn(context, viewer) })}
            className={`${OUTLINE_BUTTON} h-14 w-full`}
          >
            <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
            {fillTemplate(copy.sms, { name: nameIn(context, first) })}
          </CallLink>
        )}

        {report && viewer && (
          <>
            <div className="flex gap-3">
              {report.status === "SEARCHING" && (
                <button type="button" onClick={() => context.act({ type: "status", memberId: viewer.id, status: "ON_THE_WAY" })} className={ANSWER}>
                  {copy.onWay}
                </button>
              )}
              {!report.confirmedLost && (
                <button type="button" onClick={() => context.act({ type: "lost", memberId: viewer.id })} className={ANSWER}>
                  {copy.lost}
                </button>
              )}
            </div>
            <div>
              <button type="button" disabled={share === "sharing"} onClick={shareLocation} className={`${OUTLINE_BUTTON} w-full`}>
                <LocateFixed className="size-4 text-primary" aria-hidden="true" />
                {copy.share}
              </button>
              <p role="status" className="mt-2 text-center text-caption text-pretty text-text-muted">
                {share === "shared" ? copy.shared : share === "failed" ? copy.shareFailed : copy.shareHint}
              </p>
            </div>
          </>
        )}

        {/* On a phone the same action is the bar fixed to the bottom edge; here it sits with the rest from 1024px. */}
        <button
          type="button"
          onClick={onAction}
          className={`hidden h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-full px-6 text-label-lg transition-[background-color,scale] duration-150 ease-out active:scale-[0.98] lg:inline-flex ${
            report ? "border border-border-strong text-text hover:bg-surface-muted" : "border border-primary text-primary hover:bg-primary-subtle"
          }`}
        >
          {report ? <Check className="size-5" strokeWidth={3} aria-hidden="true" /> : <LifeBuoy className="size-5" aria-hidden="true" />}
          {actionLabel}
        </button>
        {!report && <p className="hidden text-center text-caption text-pretty text-text-muted lg:block">{copy.buttonHint}</p>}

        {viewer && (
          <button type="button" onClick={() => onOpenCard(viewer.id)} className={`${TEXT_ACTION} -ml-3`}>
            <IdCard className="size-4" aria-hidden="true" />
            {copy.card}
          </button>
        )}
      </div>
      <MapPeek place={peeking ? place : null} online={context.online} text={text.meeting} closeLabel={text.close} onClose={() => setPeeking(false)} />
    </section>
  );
}
