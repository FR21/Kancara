"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { buttonClass } from "@/components/ui/styles";

type CopyButtonProps = {
  text: string;
  label: string;
  copiedLabel: string;
  className?: string;
};

const COPIED_MS = 2000;
const noSubscription = () => () => undefined;
const hasClipboard = () => navigator.clipboard !== undefined;

// A small outlined pill that copies a piece of text and says so for two seconds. Browsers without the clipboard
// (an address without HTTPS, some embedded views) get no button, since pressing it could not work.
export default function CopyButton({ text, label, copiedLabel, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canCopy = useSyncExternalStore(noSubscription, hasClipboard, () => true);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  if (!canCopy) return null;

  return (
    <button type="button" onClick={copy} className={`${buttonClass("outline", "small")} ${className}`}>
      {copied ? (
        <Check className="size-4 text-success" strokeWidth={3} aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
}
