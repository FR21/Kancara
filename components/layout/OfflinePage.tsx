"use client";

import { Home, RefreshCcw, WifiOff } from "lucide-react";
import Link from "next/link";
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from "@/components/plan/styles";
import { useMessages } from "@/lib/use-messages";

// Shown in place of a page that was never opened on this device when there is no connection to fetch it.
export default function OfflinePage() {
  const text = useMessages("error");

  return (
    <main className="grid min-h-dvh flex-1 place-items-center px-4 py-28">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-primary-subtle text-primary motion-safe:animate-message-in">
          <WifiOff className="size-10" aria-hidden="true" />
        </span>
        <h1 className="mt-8 text-h2 text-balance text-text motion-safe:animate-message-in motion-safe:[animation-delay:60ms] sm:text-h1">
          {text.offline.title}
        </h1>
        <p className="mt-3 text-body text-pretty text-text-muted motion-safe:animate-message-in motion-safe:[animation-delay:120ms]">
          {text.offline.description}
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 motion-safe:animate-message-in motion-safe:[animation-delay:180ms] sm:w-auto sm:flex-row">
          <button type="button" onClick={() => window.location.reload()} className={`group ${PRIMARY_BUTTON}`}>
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
