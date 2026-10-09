"use client";

import { Plus } from "lucide-react";
import { useMessages } from "@/lib/use-messages";
import ScrollReveal from "./ScrollReveal";

// Questions and answers in plain sentences. Every answer is in the page's HTML whether or not it is open, and
// the same text is published as structured data, so people, search engines, and AI assistants read one version.
export default function FaqSection() {
  const text = useMessages("landing").faq;

  return (
    <section id="faq" className="relative w-full px-4 py-16 sm:px-6 sm:py-24 md:px-12 lg:px-20">
      <div className="mx-auto max-w-3xl">
        <ScrollReveal className="text-center">
          <h2 className="font-heading text-h1 text-balance text-text sm:text-display">{text.heading}</h2>
          <p className="mt-2 text-body text-text-muted">{text.subtitle}</p>
        </ScrollReveal>

        <ScrollReveal delayMs={120} className="mt-10 border-t border-dashed border-border-strong">
          {text.items.map((item) => (
            <details key={item.question} name="faq" className="group/faq border-b border-dashed border-border-strong">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left [&::-webkit-details-marker]:hidden">
                <h3 className="font-sans text-label-lg text-text">{item.question}</h3>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border-strong text-primary transition-[background-color,border-color,rotate] duration-200 ease-out group-open/faq:rotate-45 group-open/faq:border-primary group-open/faq:bg-primary-subtle group-hover/faq:border-primary">
                  <Plus className="size-4" aria-hidden="true" />
                </span>
              </summary>
              <p className="max-w-prose pr-12 pb-6 text-body text-pretty text-text-muted">{item.answer}</p>
            </details>
          ))}
        </ScrollReveal>
      </div>
    </section>
  );
}
