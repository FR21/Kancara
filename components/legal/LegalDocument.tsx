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
// reader, and the sections at a line length of about seventy characters. The
// privacy policy and the terms share it.
export default function LegalDocument({ current, legal }: LegalDocumentProps) {
  const text = legal[current];
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

        </article>
      </div>
    </PageShell>
  );
}
