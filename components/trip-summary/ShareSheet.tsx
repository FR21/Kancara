"use client";

import { Check, CircleAlert, Copy, MessageCircle } from "lucide-react";
import { useState } from "react";
import Sheet from "@/components/ui/Sheet";
import { FIELD_LABEL, buttonClass } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";

type ShareSheetProps = {
  /** The message to share, or null while the sheet is closed. */
  message: string | null;
  text: Messages["tripSummary"]["share"];
  onClose: () => void;
};

type CopyState = "idle" | "copied" | "failed";

// The summary as a chat message: shown in full first, so nobody sends words they have not seen, then sent
// straight to WhatsApp or copied for any other app.
export default function ShareSheet({ message, text, onClose }: ShareSheetProps) {
  const [copy, setCopy] = useState<CopyState>("idle");

  const close = () => {
    setCopy("idle");
    onClose();
  };

  const copyMessage = async () => {
    if (!message) return;
    try {
      // The clipboard is missing outside a secure page and can be refused; the text stays selectable then.
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(message);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  };

  return (
    <Sheet
      open={message !== null}
      title={text.title}
      closeLabel={text.close}
      onClose={close}
      footer={
        <>
          <button type="button" onClick={copyMessage} className={`${buttonClass("outline")} flex-1 basis-36`}>
            {copy === "copied" ? (
              <Check className="size-4 text-success motion-safe:animate-pop-in" strokeWidth={3} aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {copy === "copied" ? text.copied : text.copy}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message ?? "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${buttonClass("primary")} flex-1 basis-36`}
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            {text.whatsapp}
          </a>
        </>
      }
    >
      <figure>
        <figcaption className={FIELD_LABEL}>{text.preview}</figcaption>
        <p className="mt-2 rounded-lg border border-border bg-surface px-4 py-3 text-body-sm wrap-break-word whitespace-pre-line text-text select-text">
          {message}
        </p>
      </figure>
      <p role="status" className="sr-only">
        {copy === "copied" ? text.copied : ""}
      </p>
      {copy === "failed" && (
        <p role="alert" className="flex items-start gap-2 text-body-sm text-error">
          <CircleAlert className="mt-1 size-4 shrink-0" aria-hidden="true" />
          {text.copyFailed}
        </p>
      )}
    </Sheet>
  );
}
