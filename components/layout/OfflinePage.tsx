"use client";

import { Home, RefreshCcw, WifiOff } from "lucide-react";
import Link from "next/link";
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from "@/components/ui/styles";
import { useMessages } from "@/lib/use-messages";

// The service worker sends a page it could not fetch here with that page's address (?from=). Only an address on
// this site is followed, so a link made to look like this page cannot send anyone elsewhere.
function pageToRetry(): string | null {
  const from = new URLSearchParams(window.location.search).get("from");
  if (!from?.startsWith("/") || from.startsWith("//")) return null;
  try {
    const target = new URL(from, window.location.origin);
    if (target.origin !== window.location.origin) return null;
    return target.pathname + target.search + target.hash;
  } catch {
    return null;
  }
}

// Opens the page that could not be fetched again; reached directly, the offline page has none and loads itself again.
function retry() {
  const target = pageToRetry();
  if (target) window.location.assign(target);
  else window.location.reload();
}

// Shown in place of a page that was never opened on this device when there is no connection to fetch it.
export default function OfflinePage() {
  const text = useMessages("error");

  return (
    <main className="grid min-h-dvh flex-1 place-items-center px-4 py-28">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-subtle text-primary motion-safe:animate-message-in">
          <WifiOff className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-h2 text-balance text-text motion-safe:animate-message-in motion-safe:[animation-delay:60ms] sm:text-h1">
          {text.offline.title}
        </h1>
        <p className="mt-2 text-body text-pretty text-text-muted motion-safe:animate-message-in motion-safe:[animation-delay:120ms]">
          {text.offline.description}
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 motion-safe:animate-message-in motion-safe:[animation-delay:180ms] sm:w-auto sm:flex-row">
          <button type="button" onClick={retry} className={`group ${PRIMARY_BUTTON}`}>
            <RefreshCcw
              className="size-4 transition-[rotate] duration-500 ease-out group-hover:-rotate-180"
              aria-hidden="true"
            />
            {text.retry}
          </button>
          <Link href="/trips" className={`group ${OUTLINE_BUTTON}`}>
            <Home className="size-4 transition-[translate] duration-200 ease-out group-hover:-translate-y-1" aria-hidden="true" />
            {text.offline.trips}
          </Link>
        </div>
      </div>
    </main>
  );
}
