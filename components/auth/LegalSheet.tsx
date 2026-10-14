"use client";

import LegalSectionText from "@/components/legal/LegalSectionText";
import Sheet from "@/components/ui/Sheet";
import type { Messages } from "@/lib/messages";
import type { LegalLink } from "@/lib/nav-links";

export type LegalKind = LegalLink["key"];

type LegalSheetProps = {
  /** The text to show, or null while the sheet is closed. */
  kind: LegalKind | null;
  legal: Messages["legal"];
  onClose: () => void;
};

// The terms or the privacy policy, read from the sign-up form without leaving it, so nothing typed so far is lost.
export default function LegalSheet({ kind, legal, onClose }: LegalSheetProps) {
  const content = legal[kind ?? "terms"];

  return (
    <Sheet open={kind !== null} title={content.title} closeLabel={legal.close} onClose={onClose}>
      <p className="text-body-sm text-text-muted tabular-nums">{content.lastUpdated}</p>
      {content.sections.map((section) => (
        <section key={section.heading}>
          <h3 className="text-label-lg text-pretty text-text">{section.heading}</h3>
          <LegalSectionText body={section.body} className="mt-2 space-y-3 text-body-sm text-pretty text-text-muted" />
        </section>
      ))}
    </Sheet>
  );
}
