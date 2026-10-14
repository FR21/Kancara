import { ArrowRight } from "lucide-react";
import Link from "next/link";
import PageBackdrop from "@/components/layout/PageBackdrop";
import PageHeader from "@/components/layout/PageHeader";
import PageShell from "@/components/layout/PageShell";
import type { Messages } from "@/lib/messages";
import { LEGAL_LINKS } from "@/lib/nav-links";
import LegalContents from "./LegalContents";
import LegalSectionText from "./LegalSectionText";

type LegalDocumentProps = {
  /** Which of the two legal texts this page shows. */
  current: (typeof LEGAL_LINKS)[number]["key"];
  legal: Messages["legal"];
};

const NUMBERED = /^(\d+)\.\s*(.*)$/;

// Headings are written "1. Title". The number is set apart so the rail and the text can each place it.
function splitHeading(heading: string, position: number): { number: string; title: string } {
  const match = NUMBERED.exec(heading);
  return match ? { number: match[1], title: match[2] } : { number: String(position), title: heading };
}

// A legal text laid out for reading: its title and when it changed, a rail of its sections that follows the
// reader, the sections at a line length of about seventy characters, and the other document at the end. The
// privacy policy and the terms share it.
export default function LegalDocument({ current, legal }: LegalDocumentProps) {
  const text = legal[current];
  const other = LEGAL_LINKS.find((link) => link.key !== current);
  const sections = text.sections.map((section, index) => ({
    ...splitHeading(section.heading, index + 1),
    id: `section-${index + 1}`,
    body: section.body,
  }));

  return (
    <PageShell width="workspace">
      <PageBackdrop />
      <PageHeader title={text.title} lead={<span className="tabular-nums">{text.lastUpdated}</span>} />

      <div className="mt-8 motion-safe:animate-message-in lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-x-16">
        <div className="border-b border-border pb-8 lg:sticky lg:top-28 lg:border-b-0 lg:pb-0">
          <LegalContents
            label={legal.contents}
            entries={sections.map(({ id, number, title }) => ({ id, number, title }))}
          />
        </div>

        <article className="mt-8 max-w-xl min-w-0 lg:mt-0">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className={`scroll-mt-28 ${index > 0 ? "mt-12 border-t border-border pt-12" : ""}`}
            >
              <h2 id={`${section.id}-title`} className="flex gap-3 text-h2 text-pretty text-text">
                <span className="shrink-0 text-primary tabular-nums">{section.number}.</span>
                {section.title}
              </h2>
              <LegalSectionText body={section.body} className="mt-4 space-y-4 text-body leading-7 text-pretty text-text" />
            </section>
          ))}

          {other && (
            <Link
              href={other.href}
              className="group mt-12 flex items-center justify-between gap-4 rounded-surface border border-border-strong p-surface text-label-lg text-text transition-[background-color,border-color,scale] duration-150 ease-out hover:border-primary hover:bg-primary-subtle active:scale-[0.99]"
            >
              {legal[other.key].title}
              <ArrowRight
                className="size-5 shrink-0 text-primary transition-[translate] duration-200 ease-out group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          )}
        </article>
      </div>
    </PageShell>
  );
}
