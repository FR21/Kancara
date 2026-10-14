"use client";

import { Home, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from "@/components/ui/styles";
import { useMessages } from "@/lib/use-messages";
import { ErrorInstrument } from "@/components/ui/ErrorInstrument";

export interface ErrorStateProps {
  type: "404" | "500";
  onRetry?: () => void;
  showHomeButton?: boolean;
}

const DIGITS: Record<ErrorStateProps["type"], [string, string]> = {
  "404": ["4", "4"],
  "500": ["5", "0"],
};

export function ErrorState({ type, onRetry, showHomeButton = true }: ErrorStateProps) {
  const text = useMessages("error");
  const copy = text[type];
  const [before, after] = DIGITS[type];

  return (
    <main className="grid min-h-dvh flex-1 place-items-center px-4 py-28">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <p className="flex items-center gap-1 font-heading text-7xl leading-none font-semibold text-text motion-safe:animate-message-in sm:text-8xl">
          <span className="sr-only">{type}</span>
          <span aria-hidden="true">{before}</span>
          <ErrorInstrument kind={type === "404" ? "compass" : "horizon"} />
          <span aria-hidden="true">{after}</span>
        </p>

        <h1 className="mt-8 text-h2 text-balance text-text motion-safe:animate-message-in motion-safe:[animation-delay:60ms] sm:text-h1">
          {copy.title}
        </h1>
        <p className="mt-2 text-body text-pretty text-text-muted motion-safe:animate-message-in motion-safe:[animation-delay:120ms]">
          {copy.description}
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 motion-safe:animate-message-in motion-safe:[animation-delay:180ms] sm:w-auto sm:flex-row">
          {onRetry && (
            <button type="button" onClick={onRetry} className={`group ${PRIMARY_BUTTON}`}>
              <RefreshCcw
                className="size-4 transition-[rotate] duration-500 ease-out group-hover:-rotate-180 group-active:-rotate-360"
                aria-hidden="true"
              />
              {text.retry}
            </button>
          )}
          {showHomeButton && (
            <Link href="/" className={`group ${onRetry ? OUTLINE_BUTTON : PRIMARY_BUTTON}`}>
              <Home
                className="size-4 transition-[translate] duration-200 ease-out group-hover:-translate-y-1"
                aria-hidden="true"
              />
              {text.home}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
