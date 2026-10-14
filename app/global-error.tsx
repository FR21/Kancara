"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { DEFAULT_LOCALE } from "@/lib/locale";
import { FONT_CLASSES } from "./fonts";
import "./globals.css";

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang={DEFAULT_LOCALE} className={FONT_CLASSES}>
      <body className="flex min-h-dvh flex-col font-sans">
        <ErrorState type="500" onRetry={retry} />
      </body>
    </html>
  );
}
