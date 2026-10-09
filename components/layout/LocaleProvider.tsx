"use client";

import type { ReactNode } from "react";
import type { Locale } from "@/lib/locale";
import { ServerLocaleContext } from "@/lib/use-locale";

type LocaleProviderProps = {
  locale: Locale;
  children: ReactNode;
};

/** Tells every component below which language the server rendered, so the first client render matches it. */
export default function LocaleProvider({ locale, children }: LocaleProviderProps) {
  return <ServerLocaleContext value={locale}>{children}</ServerLocaleContext>;
}
