"use client";

import { RefreshCcw, Home, AlertTriangle, SearchX } from "lucide-react";
import Link from "next/link";
import { useMessages } from "@/lib/use-messages";

export interface ErrorStateProps {
  type: "404" | "500";
  onRetry?: () => void;
  showHomeButton?: boolean;
}

export function ErrorState({ type, onRetry, showHomeButton = true }: ErrorStateProps) {
  const text = useMessages("error");
  const data = text[type as keyof typeof text] as { title: string; description: string };

  const icon =
    type === "404" ? (
      <SearchX className="size-10 sm:size-12" />
    ) : (
      <AlertTriangle className="size-10 sm:size-12" />
    );

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8 text-center max-w-md mx-auto">
      <div className="mb-6 flex justify-center">
        {type === "500" ? (
          <div className="bg-error-subtle rounded-full p-4 text-on-error-subtle shadow-sm shadow-neutral-950/5">
            {icon}
          </div>
        ) : (
          <div className="bg-surface-muted rounded-full p-4 text-text-muted shadow-sm shadow-neutral-950/5">
            {icon}
          </div>
        )}
      </div>

      <h2 className="text-xl md:text-2xl font-bold font-heading mb-3 text-text">
        {data.title}
      </h2>
      <p className="text-sm md:text-base text-text-muted mb-8 leading-relaxed">
        {data.description}
      </p>

      {/* Mobile layout reflows to a stacked column for buttons, with minimum 48px tap targets */}
      <div className="flex flex-col w-full gap-3 sm:flex-row sm:justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 bg-primary active:bg-primary-hover hover:bg-primary-hover text-on-primary font-medium py-3 px-6 rounded-xl min-h-[48px] min-w-[48px] transition-[background-color,transform] active:scale-[0.98] w-full sm:w-auto"
            aria-label={text.retry}
          >
            <RefreshCcw className="size-5" />
            <span>{text.retry}</span>
          </button>
        )}

        {showHomeButton && (
          <Link
            href="/"
            className="flex items-center justify-center gap-2 bg-surface-muted active:bg-border hover:bg-border text-text font-medium py-3 px-6 rounded-xl min-h-[48px] min-w-[48px] transition-[background-color,transform] active:scale-[0.98] w-full sm:w-auto"
          >
            <Home className="size-5" />
            <span>{text.home}</span>
          </Link>
        )}
      </div>
    </div>
  );
}

