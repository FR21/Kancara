import Image from "next/image";
import type { ReactNode } from "react";
import PageBackdrop from "@/components/layout/PageBackdrop";
import PageShell from "@/components/layout/PageShell";

type StandaloneShellProps = {
  /** "narrow" for one choice or one message, "workspace" for the help page with its side column from 1024px. */
  width: "narrow" | "workspace";
  /** Centres the wordmark, for a page whose content is centred too. */
  centered?: boolean;
  lang?: string;
  dir?: "ltr" | "rtl";
  className?: string;
  children: ReactNode;
};

// The frame of the pages opened without the site's navigation: the group's invite, a member's own help link, and
// the page a stranger reaches from a meeting card. Whoever opens them may have no account, so the wordmark is the
// only chrome. It is PageShell without the navbar's clearance.
export default function StandaloneShell({ width, centered = false, lang, dir, className = "", children }: StandaloneShellProps) {
  return (
    <PageShell width={width} chrome="none" lang={lang} dir={dir} className={className}>
      <PageBackdrop />
      <Image
        src="/images/logo/kancara_wordmark_logo.webp"
        alt="Kancara"
        width={232}
        height={77}
        sizes="140px"
        loading="eager"
        className={`mb-8 h-8 w-auto ${centered ? "self-center" : "self-start"}`}
      />
      {children}
    </PageShell>
  );
}
