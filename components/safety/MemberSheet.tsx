"use client";

import { Check, CloudOff, IdCard, Link2, MapPin, MessageCircle, MessageSquareText, Phone, UserRoundSearch } from "lucide-react";
import { useEffect, useState } from "react";
import Checkbox from "@/components/plan/Checkbox";
import { INPUT, OUTLINE_BUTTON, PRIMARY_BUTTON } from "@/components/plan/styles";
import { fillTemplate } from "@/lib/plan-draft";
import { mapLink, MAX_PHONE_CHARS, whatsAppLink } from "@/lib/safety/contact";
import { type SafetyMember, type SafetyReport, openReportFor, REPORT_STATUSES } from "@/lib/safety/pack";
import { companionsOf, planPosition } from "@/lib/safety/plan-position";
import { useLocale } from "@/lib/use-locale";
import { CallLink } from "./CallLink";
import ContactList from "./ContactList";
import { type HelpContext, helpLink, nameIn, searchMessage } from "./help";
import Sheet from "./Sheet";

type MemberSheetProps = {
  context: HelpContext;
  /** The member shown, or null while the sheet is closed. */
  member: SafetyMember | null;
  onClose: () => void;
  onOpenCard: (memberId: string) => void;
};

const SECTION_TITLE = "text-label text-text";
const REACH_BUTTON =
  "flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-label transition-[background-color,border-color,scale] duration-150 ease-out active:scale-[0.97]";

function ReachButtons({ context, member }: { context: HelpContext; member: SafetyMember & { phone: string } }) {
  const copy = context.text.search;
  const message = searchMessage(context, member);
  return (
    <div className="grid grid-cols-3 gap-2">
      <CallLink phone={member.phone} name={nameIn(context, member)} className={`${REACH_BUTTON} border-primary bg-primary text-on-primary hover:bg-primary-hover`}>
        <Phone className="size-5" aria-hidden="true" />
        {copy.call}
      </CallLink>
      <a
        href={whatsAppLink(member.phone, message)}
        target="_blank"
        rel="noopener noreferrer"
        className={`${REACH_BUTTON} border-border-strong text-text hover:bg-surface-muted`}
      >
        <MessageCircle className="size-5 text-primary" aria-hidden="true" />
        {copy.whatsapp}
      </a>
      <CallLink phone={member.phone} name={nameIn(context, member)} message={message} className={`${REACH_BUTTON} border-border-strong text-text hover:bg-surface-muted`}>
        <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
        {copy.sms}
      </CallLink>
    </div>
  );
}

const hasNumber = (member: SafetyMember): member is SafetyMember & { phone: string } => member.hasPhone && member.phone !== null;

/** The three steps of a search on the schedule's axis, the one it is at ringed. */
export function SearchSteps({ report, context }: { report: SafetyReport; context: HelpContext }) {
  const current = REPORT_STATUSES.indexOf(report.status);
  return (
    <ol className="flex items-center gap-2">
      {REPORT_STATUSES.map((status, index) => (
        <li
          key={status}
          aria-current={index === current ? "step" : undefined}
          className={`flex items-center gap-2 ${index < REPORT_STATUSES.length - 1 ? "flex-1" : ""}`}
        >
          <span
            aria-hidden="true"
            className={`size-3 shrink-0 rounded-full transition-[background-color,scale] duration-300 ease-out ${
              index === current ? "bg-primary ring-4 ring-primary/25" : index < current ? "bg-primary" : "scale-75 bg-border-strong"
            }`}
          />
          <span className={`text-caption font-bold whitespace-nowrap ${index <= current ? "text-text" : "text-text-muted"}`}>
            {context.text.search.steps[status]}
          </span>
          {index < REPORT_STATUSES.length - 1 && <span aria-hidden="true" className="min-w-3 flex-1 border-t border-border-strong" />}
        </li>
      ))}
    </ol>
  );
}

const COPIED_MS = 2000;

// A member's own link, handed over by whoever manages the trip: straight into their WhatsApp when the group has
// their number, through the phone's share sheet otherwise. Opening it needs no account.
function HelpLink({ context, member }: { context: HelpContext; member: SafetyMember }) {
  const copy = context.text.member;
  const name = nameIn(context, member);
  const link = helpLink(context, member);
  const message = fillTemplate(copy.linkMessage, { trip: context.pack.tripName, link });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const share = async () => {
    // Without a share sheet (most desktops) the link is copied instead.
    if (!("share" in navigator)) return copyLink();
    try {
      await navigator.share({ text: message });
    } catch {
      // Closing the share sheet is not a failure.
    }
  };

  return (
    <div>
      {hasNumber(member) ? (
        <a href={whatsAppLink(member.phone, message)} target="_blank" rel="noopener noreferrer" className={`${OUTLINE_BUTTON} w-full`}>
          <MessageCircle className="size-5 text-primary" aria-hidden="true" />
          {copy.sendLink}
        </a>
      ) : (
        <button type="button" onClick={share} className={`${OUTLINE_BUTTON} w-full`}>
          {copied ? <Check className="size-5 text-success" strokeWidth={3} aria-hidden="true" /> : <Link2 className="size-5 text-primary" aria-hidden="true" />}
          <span role="status">{copied ? copy.linkCopied : copy.shareLink}</span>
        </button>
      )}
      <p className="mt-2 text-center text-caption text-pretty text-text-muted">{fillTemplate(copy.linkHint, { name })}</p>
    </div>
  );
}

function ContactForm({ context, member }: { context: HelpContext; member: SafetyMember }) {
  const copy = context.text.member;
  const [phone, setPhone] = useState(member.phone ?? "");
  const [hasPhone, setHasPhone] = useState(member.hasPhone);
  const [state, setState] = useState<"idle" | "saving" | "invalid" | "failed">("idle");
  const changed = phone.trim() !== (member.phone ?? "") || hasPhone !== member.hasPhone;

  const save = async () => {
    setState("saving");
    const outcome = await context.act({ type: "member", memberId: member.id, phone: phone.trim() === "" ? null : phone, hasPhone });
    setState(outcome === "done" ? "idle" : outcome === "invalid" ? "invalid" : "failed");
  };

  return (
    <section>
      <h3 className={SECTION_TITLE}>{copy.edit}</h3>
      <label className="mt-3 flex cursor-pointer items-center gap-3 text-body-sm text-text">
        <Checkbox checked={hasPhone} onChange={setHasPhone} />
        {copy.hasPhone}
      </label>
      {hasPhone && (
        <>
          <label htmlFor="member-phone" className="mt-4 block text-caption font-bold text-text-muted">
            {copy.phone}
          </label>
          <input
            id="member-phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            maxLength={MAX_PHONE_CHARS}
            value={phone}
            placeholder="+62 812 3456 7890"
            aria-describedby="member-phone-hint"
            aria-invalid={state === "invalid"}
            onChange={(event) => {
              setPhone(event.target.value);
              setState("idle");
            }}
            className={`${INPUT} mt-2 tabular-nums`}
          />
          <p id="member-phone-hint" className={`mt-2 text-caption text-pretty ${state === "invalid" ? "text-error" : "text-text-muted"}`}>
            {state === "invalid" ? copy.phoneInvalid : copy.phoneHint}
          </p>
        </>
      )}
      {state === "failed" && (
        <p role="alert" className="mt-2 text-caption text-error">
          {context.online ? context.text.failed : context.text.offlineOnly}
        </p>
      )}
      {changed && (
        <button type="button" disabled={state === "saving"} onClick={save} className={`${OUTLINE_BUTTON} mt-4 h-11`}>
          {context.text.save}
        </button>
      )}
    </section>
  );
}

// One member of the group. With no search open it is how to reach them, their card, and their number. The moment
// they are reported missing it becomes the search: where the plan has them, whom to call, and how it ends.
export default function MemberSheet({ context, member, onClose, onOpenCard }: MemberSheetProps) {
  const locale = useLocale();
  const { pack, text, clock } = context;
  const copy = text.search;
  const report = member ? openReportFor(pack, member.id) : null;
  const name = member ? nameIn(context, member) : "";
  const isViewer = member !== null && member.id === pack.viewerMemberId;
  const position = clock ? planPosition(pack.days, clock) : null;
  const others = member ? companionsOf(pack, member.id) : [];
  const reachable = others.filter(hasNumber).filter((entry) => entry.id !== pack.viewerMemberId);
  // Nobody is singled out as a companion until the plan says who goes where, so the whole group is named.
  const withWhom = text.everyone;
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });

  const planLine = () => {
    if (!position) return copy.planNone;
    const values = { with: withWhom, place: position.stop.title, until: position.until };
    if (position.state === "last") return fillTemplate(copy.planLast, values);
    return fillTemplate(position.until ? copy.planNow : copy.planNowOpen, values);
  };

  return (
    <Sheet
      open={member !== null}
      title={report ? fillTemplate(copy.title, { name }) : name}
      closeLabel={text.close}
      onClose={onClose}
      footer={
        member && report ? (
          <>
            {report.status === "SEARCHING" && (
              <button
                type="button"
                onClick={() => context.act({ type: "status", memberId: member.id, status: "ON_THE_WAY" })}
                className={`${OUTLINE_BUTTON} min-w-0 flex-1 px-3 text-label whitespace-nowrap`}
              >
                {copy.markOnWay}
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                await context.act({ type: "status", memberId: member.id, status: "FOUND" });
                onClose();
              }}
              className={`${PRIMARY_BUTTON} min-w-0 flex-1 px-3 text-label whitespace-nowrap`}
            >
              {copy.markFound}
            </button>
          </>
        ) : undefined
      }
    >
      {member && report && (
        <>
          <SearchSteps report={report} context={context} />

          <div role="status" className="space-y-2 empty:hidden">
            {report.id.startsWith("waiting:") && (
              <p className="flex items-start gap-2 text-body-sm text-pretty text-text-muted">
                <CloudOff className="size-5 shrink-0" aria-hidden="true" />
                {copy.queued}
              </p>
            )}
            {report.source === "FINDER" && (
              <p className="rounded-2xl bg-success-subtle px-4 py-3 text-body-sm text-pretty text-on-success-subtle">
                {fillTemplate(copy.finderWith, { name })}
              </p>
            )}
            {report.confirmedLost && (
              <p className="rounded-2xl bg-warning-subtle px-4 py-3 text-body-sm text-pretty text-on-warning-subtle">
                {fillTemplate(copy.confirmedLost, { name })}
              </p>
            )}
            {report.shared && (
              <a
                href={mapLink(report.shared)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-12 items-center gap-3 rounded-2xl bg-primary-subtle px-4 py-3 text-body-sm text-on-primary-subtle transition-[scale] duration-150 ease-out active:scale-[0.99]"
              >
                <MapPin className="size-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 tabular-nums">
                  {fillTemplate(copy.shared, { time: time.format(new Date(report.shared.at)) })}
                </span>
                <span className="shrink-0 text-label underline underline-offset-4">{copy.openMap}</span>
              </a>
            )}
          </div>

          <section>
            <h3 className={SECTION_TITLE}>{copy.planTitle}</h3>
            <p className="mt-2 text-body text-pretty text-text">{planLine()}</p>
            {position?.stop.address && <p className="mt-1 text-body-sm text-pretty text-text-muted">{position.stop.address}</p>}
          </section>

          <section>
            <h3 className={SECTION_TITLE}>{fillTemplate(member.hasPhone ? copy.reachTitle : copy.noPhoneTitle, { name })}</h3>
            <div className="mt-3 space-y-3">
              {hasNumber(member) && <ReachButtons context={context} member={member} />}
              {member.joined && member.hasPhone && (
                <p className="text-body-sm text-pretty text-text-muted">{fillTemplate(copy.toldInApp, { name })}</p>
              )}
              {!member.hasPhone && <p className="text-body-sm text-pretty text-text">{copy.noPhoneBody}</p>}
              {member.hasPhone && member.phone === null && (
                <p className="text-body-sm text-pretty text-text-muted">{fillTemplate(copy.noNumber, { name })}</p>
              )}
            </div>
          </section>

          {!hasNumber(member) && reachable.length > 0 && (
            <section>
              <h3 className={SECTION_TITLE}>{copy.callable}</h3>
              <ul className="mt-2 space-y-2">
                {reachable.map((entry) => (
                  <li key={entry.id}>
                    <CallLink
                      phone={entry.phone}
                      name={nameIn(context, entry)}
                      className="flex min-h-14 items-center gap-3 rounded-2xl border border-border-strong px-4 py-2 text-label text-text transition-[background-color,scale] duration-150 ease-out hover:bg-surface-muted active:scale-[0.99]"
                    >
                      <Phone className="size-5 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0 flex-1">{fillTemplate(text.roll.call, { name: nameIn(context, entry) })}</span>
                    </CallLink>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className={SECTION_TITLE}>{text.contacts.title}</h3>
            <div className="-mx-3 mt-2">
              <ContactList pack={pack} text={text} />
            </div>
          </section>
        </>
      )}

      {member && !report && (
        <>
          {!isViewer && (
            <div>
              <button
                type="button"
                onClick={() => context.act({ type: "report", memberId: member.id })}
                className={`${PRIMARY_BUTTON} h-14 w-full`}
              >
                <UserRoundSearch className="size-5" aria-hidden="true" />
                {fillTemplate(copy.report, { name })}
              </button>
              <p className="mt-2 text-center text-caption text-pretty text-text-muted">{copy.reportHint}</p>
            </div>
          )}

          {!isViewer && hasNumber(member) && <ReachButtons context={context} member={member} />}

          {!isViewer && member.hasPhone && !member.joined && helpLink(context, member) !== "" && <HelpLink context={context} member={member} />}

          <button type="button" onClick={() => onOpenCard(member.id)} className={`${OUTLINE_BUTTON} w-full`}>
            <IdCard className="size-5 text-primary" aria-hidden="true" />
            {text.card.open}
          </button>

          {(pack.canManage || isViewer) && <ContactForm key={member.id} context={context} member={member} />}
        </>
      )}
    </Sheet>
  );
}
