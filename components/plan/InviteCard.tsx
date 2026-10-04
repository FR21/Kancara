"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Messages } from "@/lib/messages";

type InviteCardProps = {
  url: string;
  text: Messages["plan"]["invite"];
};

const COPIED_MS = 2000;
const subscribeToNothing = () => () => {};

const BUTTON =
  "inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-label transition-[background-color,scale] duration-150 ease-out active:scale-[0.97]";

export default function InviteCard({ url, text }: InviteCardProps) {
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(
    subscribeToNothing,
    () => typeof navigator.share === "function",
    () => false,
  );

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const shareLink = () => {
    navigator.share({ title: text.shareText, url }).catch(() => {});
  };

  return (
    <div className="w-full rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <h2 className="text-label-lg text-text">{text.title}</h2>
      <label htmlFor="plan-invite-link" className="mt-3 block text-caption text-text-muted">
        {text.linkLabel}
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          id="plan-invite-link"
          type="text"
          readOnly
          value={url}
          onFocus={(event) => event.target.select()}
          className="h-12 min-w-0 flex-1 basis-48 rounded-lg border border-border-strong bg-background px-4 text-body-sm text-text"
        />
        <button
          type="button"
          onClick={copyLink}
          className={`${BUTTON} min-w-28 ${
            copied
              ? "bg-success-subtle text-on-success-subtle"
              : "bg-primary text-on-primary hover:bg-primary-hover"
          }`}
        >
          {copied ? (
            <Check className="size-4" strokeWidth={3} aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          <span aria-live="polite">{copied ? text.copied : text.copy}</span>
        </button>
        {canShare && (
          <button
            type="button"
            onClick={shareLink}
            className={`${BUTTON} border border-border-strong text-text hover:bg-surface-muted`}
          >
            <Share2 className="size-4" aria-hidden="true" />
            {text.share}
          </button>
        )}
      </div>
    </div>
  );
}
