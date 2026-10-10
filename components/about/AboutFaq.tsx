"use client";

import { ArrowLeft, ArrowRight, Plane } from "lucide-react";
import Image from "next/image";
import { Fragment, useState } from "react";
import ScrollReveal from "@/components/landing/ScrollReveal";
import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";

type AboutFaqProps = {
  text: Messages["about"]["faq"];
  className: string;
};

// One half of the pass. The notches are cut out of it, so whatever lies behind the ticket shows through them.
const HALF = "ticket-notch overflow-clip bg-surface [--ticket-notch-size:0.75rem]";
const STEP =
  "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-strong text-text transition-[background-color,border-color,scale] duration-150 ease-out hover:border-primary hover:bg-primary-subtle active:scale-[0.97]";

const questionId = (index: number) => `faq-question-${index}`;
const answerId = (index: number) => `faq-answer-${index}`;

// Questions on the left, the answer printed on a boarding pass on the right. On a phone the same markup stacks:
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
    <section id="faq" className="relative isolate overflow-clip bg-section-muted py-20 lg:py-28">
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
          className="mt-10 lg:mt-14 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-x-12"
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
                    className={`group/question flex min-h-16 w-full cursor-pointer items-center gap-4 rounded-2xl px-3 py-3 text-left transition-[background-color,color,box-shadow] duration-200 ease-out sm:px-4 ${
                      selected
                        ? "bg-surface text-text shadow-sm ring-1 ring-border"
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
                  <div className="drop-shadow-xl motion-safe:animate-message-in">
                    <div className={`notch-bottom rounded-t-3xl ${HALF}`}>
                      <div className="hidden h-12 items-center gap-2 bg-primary px-8 text-on-primary lg:flex">
                        <Plane className="size-4 shrink-0" aria-hidden="true" />
                        <p className="min-w-0 truncate text-label-lg">{item.question}</p>
                      </div>
                      <p className="px-5 pt-6 pb-7 text-body leading-relaxed text-pretty text-text sm:px-8 sm:pt-8 sm:pb-9 sm:text-h3 sm:leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                    <div
                      className={`flex notch-top items-center gap-3 rounded-b-3xl border-t border-dashed border-border-strong px-5 py-4 sm:px-8 ${HALF}`}
                    >
                      <Image
                        src="/images/logo/kancara_mascot_captain_logo.webp"
                        alt=""
                        width={500}
                        height={500}
                        sizes="48px"
                        className="size-12 shrink-0 motion-safe:animate-float"
                      />
                      <p className="min-w-0 flex-1 text-caption font-bold tracking-wider text-text-muted uppercase">
                        {text.desk}
                        <span className="mt-1 block font-heading text-label-lg tracking-normal text-text normal-case tabular-nums">
                          {fillTemplate(text.position, { current: index + 1, total })}
                        </span>
                      </p>
                      <button type="button" aria-label={text.previous} title={text.previous} onClick={() => step(-1)} className={STEP}>
                        <ArrowLeft className="size-4" aria-hidden="true" />
                      </button>
                      <button type="button" aria-label={text.next} title={text.next} onClick={() => step(1)} className={STEP}>
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </button>
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
