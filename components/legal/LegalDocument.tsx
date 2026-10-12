import { ArrowRight } from "lucide-react";
import Link from "next/link";
import PageBackdrop from "@/components/layout/PageBackdrop";
import type { Messages } from "@/lib/messages";
import { LEGAL_LINKS } from "@/lib/nav-links";
import LegalContents from "./LegalContents";

type LegalDocumentProps = {
  /** Which of the two legal texts this page shows. */
  current: (typeof LEGAL_LINKS)[number]["key"];
  legal: Messages["legal"];
};

type Block = { kind: "text"; line: string } | { kind: "list"; items: string[] };

const NUMBERED = /^(\d+)\.\s*(.*)$/;

// A section's words arrive as plain lines. Lines that start with "- " and follow one another are one list.
function toBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  body.split("\n").forEach((line) => {
    if (!line.startsWith("- ")) {
      if (line.trim() !== "") blocks.push({ kind: "text", line });
      return;
    }
    const last = blocks[blocks.length - 1];
    if (last?.kind === "list") last.items.push(line.slice(2));
    else blocks.push({ kind: "list", items: [line.slice(2)] });
  });
  return blocks;
}

// Headings are written "1. Title". The number is set apart so the rail and the text can each place it.
function splitHeading(heading: string, position: number): { number: string; title: string } {
  const match = NUMBERED.exec(heading);
  return match ? { number: match[1], title: match[2] } : { number: String(position), title: heading };
}

// A legal text laid out for reading: its title and when it changed, a rail of its sections that
// follows the reader, the sections at a line length of about seventy characters, and the other document at the end. The privacy
// policy and the terms share it.
export default function LegalDocument({ current, legal }: LegalDocumentProps) {
  const text = legal[current];
  const other = LEGAL_LINKS.find((link) => link.key !== current);
  const sections = text.sections.map((section, index) => ({
    ...splitHeading(section.heading, index + 1),
    id: `section-${index + 1}`,
    blocks: toBlocks(section.body),
  }));

  return (
    <main className="relative isolate mx-auto w-full max-w-2xl flex-1 px-4 pt-24 pb-12 sm:px-6 sm:pt-28 lg:max-w-5xl xl:px-0">
      <PageBackdrop />
      <header className="motion-safe:animate-message-in">
        <h1 className="text-h1 text-balance text-text sm:text-display">{text.title}</h1>
        <p className="mt-3 text-body text-text-muted tabular-nums">{text.lastUpdated}</p>
      </header>

      <div className="mt-10 motion-safe:animate-message-in lg:mt-16 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-x-16">
        <div className="border-b border-border pb-8 lg:sticky lg:top-28 lg:border-b-0 lg:pb-0">
          <LegalContents
            label={legal.contents}
            entries={sections.map(({ id, number, title }) => ({ id, number, title }))}
          />
        </div>

        <article className="mt-10 max-w-xl min-w-0 lg:mt-0">
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
              <div className="mt-5 space-y-5 text-body leading-7 text-pretty text-text">
                {section.blocks.map((block, position) =>
                  block.kind === "text" ? (
                    <p key={position}>{block.line}</p>
                  ) : (
                    <ul key={position} className="list-disc space-y-3 pl-5 marker:text-primary">
                      {block.items.map((item) => (
                        <li key={item} className="pl-1">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
            </section>
          ))}

          {other && (
            <Link
              href={other.href}
              className="group mt-16 flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-border-strong px-5 py-4 text-label-lg text-text transition-[background-color,border-color] duration-150 ease-out hover:border-primary hover:bg-primary-subtle"
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
    </main>
  );
}
