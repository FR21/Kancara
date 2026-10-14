import type { ReactNode } from "react";

/**
 * How wide a page's content runs: "narrow" for one form or one message, "reading" for one column of content,
 * "workspace" for a tool with a side column from 1024px, "wide" for a map or a board.
 */
export type PageWidth = "narrow" | "reading" | "workspace" | "wide";

const WIDTHS: Record<PageWidth, string> = {
  narrow: "max-w-xl",
  reading: "max-w-2xl",
  workspace: "max-w-2xl lg:max-w-5xl",
  wide: "max-w-2xl lg:max-w-6xl",
};

type PageShellProps = {
  width?: PageWidth;
  /** "none" for pages opened without the site's navigation: they start near the top instead of under the navbar. */
  chrome?: "navbar" | "none";
  lang?: string;
  dir?: "ltr" | "rtl";
  children: ReactNode;
  className?: string;
};

// The frame of every app page: the same clearance under the fixed navbar, the same side margins, and the same
// room at the foot, so moving between pages never shifts where the content starts.
export default function PageShell({ width = "workspace", chrome = "navbar", lang, dir, children, className = "" }: PageShellProps) {
  const top = chrome === "navbar" ? "pt-24 sm:pt-28" : "pt-6 sm:pt-10";
  return (
    <main
      lang={lang}
      dir={dir}
      className={`relative isolate mx-auto flex w-full flex-1 flex-col px-4 pb-16 sm:px-6 xl:px-0 ${top} ${WIDTHS[width]} ${className}`}
    >
      {children}
    </main>
  );
}
