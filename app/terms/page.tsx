import type { Metadata } from "next";
import { requestLocale } from "@/lib/locale-server";
import { requestMetadata } from "@/lib/seo";
import { MESSAGES } from "@/lib/messages";

export function generateMetadata(): Promise<Metadata> {
  return requestMetadata("terms");
}

export default async function Page() {
  const locale = await requestLocale();
  const text = MESSAGES[locale].legal.terms;

  return (
    <main className="mx-auto max-w-3xl px-6 py-24 md:py-32 motion-safe:animate-fade-in">
      <h1 className="font-heading text-h1 text-text">{text.title}</h1>
      <p className="mt-4 text-body text-text-muted">{text.lastUpdated}</p>

      <div className="mt-12 flex flex-col gap-8">
        {text.sections.map((section, idx) => (
          <section key={idx}>
            <h2 className="font-heading text-h3 text-text">{section.heading}</h2>
            <div className="mt-4 flex flex-col gap-3 text-body text-text-muted">
              {section.body.split("\n").map((line, i) => {
                if (line.startsWith("- ")) {
                  return (
                    <li key={i} className="ml-4 list-disc">
                      {line.slice(2)}
                    </li>
                  );
                }
                return <p key={i}>{line}</p>;
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
