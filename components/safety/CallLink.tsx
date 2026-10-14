"use client";

import { Check, Copy, MessageCircle, Phone } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { TEXT_LINK, buttonClass } from "@/components/ui/styles";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";
import { askToCall, closeCallPrompt, dialsItself, useCallTarget } from "@/lib/safety/call-prompt";
import { callLink, formatPhone, textLink, whatsAppLink } from "@/lib/safety/contact";
import Sheet from "@/components/ui/Sheet";

type CallLinkProps = {
  phone: string;
  /** Who the number belongs to, for the popup's title. */
  name: string;
  /** Makes it a text message with these words instead of a call. */
  message?: string;
  className?: string;
  "aria-label"?: string;
  title?: string;
  children: ReactNode;
};

const COPIED_MS = 2000;

/**
 * A link that calls a number, or texts it when given a message. On a phone it is an ordinary tel: or sms: link.
 * On a device that cannot dial it opens the page's own popup with the number instead (see lib/safety/call-prompt).
 */
export function CallLink({ phone, name, message, className, children, ...labels }: CallLinkProps) {
  return (
    <a
      {...labels}
      href={message === undefined ? callLink(phone) : textLink(phone, message)}
      onClick={(event) => {
        if (dialsItself()) return;
        event.preventDefault();
        askToCall({ name, phone, message });
      }}
      className={className}
    >
      {children}
    </a>
  );
}

// The popup a call or text link opens on a device that cannot dial: the number large enough to read off, a way
// to copy it, WhatsApp for a full number, and the device's own calling app for whoever has one.
export default function CallPrompt({ text, closeLabel }: { text: Messages["safety"]["call"]; closeLabel: string }) {
  const target = useCallTarget();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  // A popup left open when its page goes away would open again on the next one.
  useEffect(() => closeCallPrompt, []);

  const copy = async () => {
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target.message === undefined ? target.phone : target.message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const isText = target?.message !== undefined;
  // Short national numbers (112, 110) have no WhatsApp.
  const full = target?.phone.startsWith("+") ?? false;

  return (
    <Sheet
      open={target !== null}
      title={target ? fillTemplate(isText ? text.textTitle : text.title, { name: target.name }) : ""}
      closeLabel={closeLabel}
      onClose={closeCallPrompt}
    >
      {target && (
        <>
          <div>
            <p className="text-h1 text-balance text-text tabular-nums">{formatPhone(target.phone)}</p>
            <p className="mt-2 text-body-sm text-pretty text-text-muted">{isText ? text.textHint : text.hint}</p>
          </div>
          {isText && <p className="rounded-lg bg-surface-muted px-4 py-3 text-body-sm text-pretty text-text">{target.message}</p>}
          <div className="flex flex-col gap-3">
            <button type="button" onClick={copy} className={`${buttonClass("primary", "large")} w-full`}>
              {copied ? <Check className="size-5 motion-safe:animate-stamp-in" strokeWidth={3} aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
              <span role="status">{copied ? text.copied : isText ? text.copyMessage : text.copy}</span>
            </button>
            {full && (
              <a
                href={whatsAppLink(target.phone, target.message ?? "")}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonClass("outline", "large")} w-full`}
              >
                <MessageCircle className="size-5 text-primary" aria-hidden="true" />
                {text.whatsapp}
              </a>
            )}
            <a
              href={isText ? textLink(target.phone, target.message ?? "") : callLink(target.phone)}
              className={`${TEXT_LINK} self-center`}
            >
              <Phone className="size-4" aria-hidden="true" />
              {text.openApp}
            </a>
          </div>
        </>
      )}
    </Sheet>
  );
}
