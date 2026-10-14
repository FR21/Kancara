"use client";

import { Check, Copy, Link2, Loader2, RefreshCw, Share2 } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { INPUT, INPUT_BUTTON, OUTLINE_BUTTON, TEXT_LINK, buttonClass } from "@/components/ui/styles";

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
const noSubscription = () => () => undefined;
const hasShareSheet = () => "share" in navigator;

// The group's one link, made where the group is put together, whether or not anyone has been added yet. Someone
// with an account joins by themselves through it; someone without picks their name. It is made on request, because
// making it keeps the plan as a draft trip. Until then the card is drawn dashed, like every slot still to be filled.
export default function InviteCard({ link, state, tripName, text, onMake, onRenew }: InviteCardProps) {
  const [copied, setCopied] = useState(false);
  const [renewing, setRenewing] = useState(false);
  // One button on the link's row: the share sheet where the device has one (it offers copying too), else a copy.
  const canShare = useSyncExternalStore(noSubscription, hasShareSheet, () => false);
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
    try {
      await navigator.share({ text: fillTemplate(text.shareText, { trip: tripName, link }) });
    } catch {
      // Closing the share sheet is not a failure.
    }
  };

  return (
    <section
      aria-labelledby="group-link-title"
      className={`rounded-surface border p-surface ${link === null ? "border-dashed border-border-strong" : "border-border bg-surface"}`}
    >
      <h2 id="group-link-title" className="flex items-center gap-2 text-label-lg text-text">
        <Link2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
        {text.title}
      </h2>
      <p className="mt-2 text-body-sm text-pretty text-text-muted">{text.body}</p>

      {link === null && (
        <button type="button" disabled={busy} onClick={onMake} className={`${OUTLINE_BUTTON} mt-6 w-full bg-surface`}>
          {busy && <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />}
          <span role="status">{busy ? text.making : text.make}</span>
        </button>
      )}

      {link !== null && (
        <div className="mt-6">
          <label htmlFor="plan-invite-link" className="sr-only">
            {text.linkLabel}
          </label>
          <div className="flex gap-2">
            <input
              id="plan-invite-link"
              type="text"
              readOnly
              value={link}
              onFocus={(event) => event.target.select()}
              className={`${INPUT} min-w-0`}
            />
            {canShare ? (
              <button type="button" disabled={busy} onClick={shareLink} className={INPUT_BUTTON}>
                <Share2 className="size-4 text-primary" aria-hidden="true" />
                {text.share}
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={copyLink} className={INPUT_BUTTON}>
                {copied ? (
                  <Check className="size-4 text-success" strokeWidth={3} aria-hidden="true" />
                ) : (
                  <Copy className="size-4 text-primary" aria-hidden="true" />
                )}
                <span role="status">{copied ? text.copied : text.copy}</span>
              </button>
            )}
          </div>

          {/* A new link ends the one already sent to the group, so it is asked for twice, with what it costs in sight. */}
          {!renewing && (
            <button type="button" disabled={busy} onClick={() => setRenewing(true)} className={`${TEXT_LINK} mt-2 disabled:cursor-not-allowed disabled:opacity-40`}>
              <RefreshCw className={`size-4 ${busy ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
              {text.renew}
            </button>
          )}
          {renewing && (
            <div className="mt-4 border-t border-border pt-4 motion-safe:animate-message-in">
              <p className="text-body-sm text-pretty text-text">{text.renewHint}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRenewing(false);
                    onRenew();
                  }}
                  className={buttonClass("outline", "small")}
                >
                  {text.renewConfirm}
                </button>
                <button type="button" onClick={() => setRenewing(false)} className={buttonClass("ghost", "small")}>
                  {text.cancel}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {state === "failed" && (
        <p role="alert" className="mt-2 text-caption text-pretty text-error">
          {text.failed}
        </p>
      )}
    </section>
  );
}
