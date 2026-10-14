"use client";

import { ArrowLeft, ArrowRight, Plane } from "lucide-react";
import Image from "next/image";
import { Fragment, useState } from "react";
import ScrollReveal from "@/components/landing/ScrollReveal";
import IconButton from "@/components/ui/IconButton";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";

type AboutFaqProps = {
  text: Messages["about"]["faq"];
  className: string;
};

const questionId = (index: number) => `faq-question-${index}`;
const answerId = (index: number) => `faq-answer-${index}`;

// Questions on the left, the open answer on one plain card on the right. On a phone the same markup stacks:
// each answer opens under its question. Every answer is in the page whether or not it is the open one, and the
// same text is published as structured data, so people, search engines, and AI assistants read one version.
export default function AboutFaq({ text, className }: AboutFaqProps) {
  const [open, setOpen] = useState(0);
  const total = text.items.length;

  // The buttons that step through the answers sit inside the answer that is about to be hidden, so focus moves
  // to the question that opens instead of being dropped.
  const step = (by: number) => {
    const next = (open + by + total) % total;
    setOpen(next);
    document.getElementById(questionId(next))?.focus();
  };

  return (
    <section id="faq" className="relative isolate overflow-clip bg-section-muted py-16 lg:py-24">
      <span
        aria-hidden="true"
        className="parallax-y pointer-events-none absolute -bottom-32 -left-28 -z-10 aspect-square w-96 rounded-full border-2 border-dashed border-primary/25 [--parallax-from:8rem] [--parallax-to:-8rem] lg:w-[30rem]"
      />
      <div className={className}>
        <ScrollReveal className="max-w-2xl">
          <h2 className="font-heading text-h1 text-balance text-text sm:text-display">{text.heading}</h2>
          <p className="mt-4 text-body text-pretty text-text-muted sm:text-h3">{text.subtitle}</p>
        </ScrollReveal>

        <ScrollReveal
          delayMs={120}
          className="mt-12 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-x-12"
        >
          {text.items.map((item, index) => {
            const selected = index === open;
            return (
              <Fragment key={item.question}>
                <h3 style={{ gridRow: index + 1 }} className="lg:col-start-1 lg:py-1">
                  <button
                    id={questionId(index)}
                    type="button"
                    aria-expanded={selected}
                    aria-controls={answerId(index)}
                    onClick={() => setOpen(index)}
                    className={`group/question flex min-h-16 w-full cursor-pointer items-center gap-4 surface-compact rounded-surface p-surface text-left transition-[background-color,color,box-shadow,scale] duration-150 ease-out active:scale-[0.99] ${
                      selected
                        ? "bg-surface text-text shadow-sm shadow-neutral-950/5 ring-1 ring-border"
                        : "text-text-muted hover:bg-surface/70 hover:text-text"
                    }`}
                  >
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,color] duration-200 ease-out ${
                        selected
                          ? "border-primary bg-primary text-on-primary"
                          : "border-border-strong text-primary group-hover/question:border-primary"
                      }`}
                    >
                      {/* The plane turns toward the answer: down on a phone, across on a laptop. */}
                      <Plane
                        aria-hidden="true"
                        className={`size-4 transition-[rotate] duration-300 ease-spring motion-reduce:transition-none ${
                          selected ? "rotate-135 lg:rotate-45" : ""
                        }`}
                      />
                    </span>
                    <span className="min-w-0 flex-1 font-heading text-h3 text-balance">{item.question}</span>
                  </button>
                </h3>

                <div
                  id={answerId(index)}
                  role="region"
                  aria-labelledby={questionId(index)}
                  hidden={!selected}
                  style={{ gridRow: `1 / span ${total}` }}
                  className="pt-2 pb-6 lg:sticky lg:top-28 lg:col-start-2 lg:py-0"
                >
                  <div className="rounded-surface border border-border bg-surface p-surface shadow-lg shadow-neutral-950/5 motion-safe:animate-message-in">
                    <p className="text-body leading-relaxed text-pretty text-text sm:text-h3 sm:leading-relaxed">
                      {item.answer}
                    </p>
                    <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                      <Image
                        src="/images/logo/kancara_mascot_captain_logo.webp"
                        alt=""
                        width={500}
                        height={500}
                        sizes="40px"
                        className="size-10 shrink-0"
                      />
                      <p className="min-w-0 flex-1 text-label text-text-muted tabular-nums">
                        {fillTemplate(text.position, { current: index + 1, total })}
                      </p>
                      <IconButton label={text.previous} onClick={() => step(-1)} className="border border-border-strong">
                        <ArrowLeft className="size-4" aria-hidden="true" />
                      </IconButton>
                      <IconButton label={text.next} onClick={() => step(1)} className="border border-border-strong">
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </IconButton>
                    </div>
                  </div>
                </div>
              </Fragment>
            );
          })}
        </ScrollReveal>
      </div>
    </section>
  );
}
