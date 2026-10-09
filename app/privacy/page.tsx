import type { Metadata } from "next";
import { requestLocale } from "@/lib/locale-server";
import { requestMetadata } from "@/lib/seo";
import { MESSAGES } from "@/lib/messages";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("privacy");
}

export default async function Page() {
  const locale = await requestLocale();
  const text = MESSAGES[locale].legal.privacy;

  return (
    <main className="relative min-h-screen pt-24 pb-32">
      <div className="absolute top-0 left-0 w-full h-[30rem] bg-primary-subtle -z-10" />

      <div className="mx-auto max-w-4xl px-6 motion-safe:animate-message-in">
        <div className="mb-12 text-center">
          <h1 className="font-heading text-display text-text">{text.title}</h1>
          <p className="mt-4 text-body text-text-muted">{text.lastUpdated}</p>
        </div>

        <div className="rounded-3xl bg-surface p-6 sm:p-12 shadow-xl shadow-neutral-950/5 border border-border flex flex-col gap-10">
          {text.sections.map((section, idx) => (
            <section key={idx}>
              <h2 className="font-heading text-h3 text-text flex items-center gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-label-lg text-primary">
                  {idx + 1}
                </span>
                {section.heading.replace(/^\d+\.\s*/, "")}
              </h2>
              <div className="mt-5 sm:pl-14 flex flex-col gap-4 text-body text-text-muted">
                {section.body.split("\n").map((line, i) => {
                  if (line.startsWith("- ")) {
                    return (
                      <li key={i} className="ml-4 list-disc marker:text-primary">
                        {line.slice(2)}
                      </li>
                    );
                  }
                  return <p key={i} className="leading-relaxed">{line}</p>;
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
