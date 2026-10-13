"use client";

import { Check, Copy, Link2, Loader2, RefreshCw, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { GHOST_BUTTON, OUTLINE_BUTTON, PRIMARY_BUTTON } from "./styles";

export type InviteState = "idle" | "preparing" | "failed";

type InviteCardProps = {
  /** The group's link, once it has been made. */
  link: string | null;
  state: InviteState;
  tripName: string;
  text: Messages["plan"]["invite"];
  onMake: () => void;
  onRenew: () => void;
};

const COPIED_MS = 2000;
const TEXT_ACTION =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-3 text-label text-primary transition-[background-color,scale] duration-150 ease-out hover:bg-primary-subtle active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40";

// The group's one link, made where the group is put together, whether or not anyone has been added yet. Someone
// with an account joins by themselves through it; someone without picks their name. It is made on request, because
// making it keeps the plan as a draft trip. Until then the card is drawn dashed, like every slot still to be filled.
export default function InviteCard({ link, state, tripName, text, onMake, onRenew }: InviteCardProps) {
  const [copied, setCopied] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const busy = state === "preparing";

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const shareLink = async () => {
    if (!link) return;
    // Without a share sheet (most desktops) the link is copied instead.
    if (!("share" in navigator)) return copyLink();
    try {
      await navigator.share({ text: fillTemplate(text.shareText, { trip: tripName, link }) });
    } catch {
      // Closing the share sheet is not a failure.
    }
  };

  return (
    <section
      aria-labelledby="group-link-title"
      className={`rounded-2xl border p-4 sm:p-5 ${link === null ? "border-dashed border-border-strong" : "border-border bg-surface"}`}
    >
      <h2 id="group-link-title" className="flex items-center gap-2 text-label-lg text-text">
        <Link2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
        {text.title}
      </h2>
      <p className="mt-2 text-body-sm text-pretty text-text-muted">{text.body}</p>

      {link === null && (
        <button type="button" disabled={busy} onClick={onMake} className={`${OUTLINE_BUTTON} mt-4 w-full bg-surface`}>
          {busy && <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />}
          <span role="status">{busy ? text.making : text.make}</span>
        </button>
      )}

      {link !== null && (
        <>
          <label htmlFor="plan-invite-link" className="sr-only">
            {text.linkLabel}
          </label>
          <input
            id="plan-invite-link"
            type="text"
            readOnly
            value={link}
            onFocus={(event) => event.target.select()}
            className="mt-4 h-12 w-full min-w-0 rounded-lg border border-border-strong bg-background px-4 text-body-sm text-text"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={shareLink} className={`${PRIMARY_BUTTON} px-4`}>
              <Share2 className="size-4" aria-hidden="true" />
              {text.share}
            </button>
            <button type="button" disabled={busy} onClick={copyLink} className={`${OUTLINE_BUTTON} px-4`}>
              {copied ? (
                <Check className="size-4 text-success" strokeWidth={3} aria-hidden="true" />
              ) : (
                <Copy className="size-4 text-primary" aria-hidden="true" />
              )}
              <span role="status">{copied ? text.copied : text.copy}</span>
            </button>
          </div>

          {/* A new link ends the one already sent to the group, so it is asked for twice, with what it costs in sight. */}
          {!renewing && (
            <button type="button" disabled={busy} onClick={() => setRenewing(true)} className={`${TEXT_ACTION} mt-1 -ml-3`}>
              <RefreshCw className={`size-4 ${busy ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
              {text.renew}
            </button>
          )}
          {renewing && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-body-sm text-pretty text-text">{text.renewHint}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRenewing(false);
                    onRenew();
                  }}
                  className={`${OUTLINE_BUTTON} h-11 px-4 text-label`}
                >
                  {text.renewConfirm}
                </button>
                <button type="button" onClick={() => setRenewing(false)} className={`${GHOST_BUTTON} h-11 text-label`}>
                  {text.cancel}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {state === "failed" && (
        <p role="alert" className="mt-2 text-caption text-pretty text-error">
          {text.failed}
        </p>
      )}
    </section>
  );
}
