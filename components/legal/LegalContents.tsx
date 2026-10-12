"use client";

import { useEffect, useState } from "react";

export type LegalEntry = { id: string; number: string; title: string };

type LegalContentsProps = {
  /** Names the list of sections, for the eye and for assistive technology. */
  label: string;
  entries: LegalEntry[];
};

// A jump from the rail parks a section this far below the top of the window, under the floating navbar. A
// section counts as reached once its top is at or above that line, with a few pixels to spare for rounding.
const REACHED_AT = 120;

// The sections of a legal text down a rail, the way a day's stops sit on the itinerary's axis. From 1024px the
// rail follows the reader and the dot of the section being read is filled; on a phone it is a plain list at the
// head of the text, where it scrolls away with the page.
export default function LegalContents({ label, entries }: LegalContentsProps) {
  const [reading, setReading] = useState(entries[0]?.id ?? "");

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const reached = entries.filter((entry) => {
        const section = document.getElementById(entry.id);
        return section !== null && section.getBoundingClientRect().top <= REACHED_AT;
      });
      // At the very end of the page the last section is being read, however short it is. A window tall enough
      // to show the whole page never scrolls, and stays on the first section.
      const atEnd =
        window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const current = atEnd ? entries[entries.length - 1] : (reached[reached.length - 1] ?? entries[0]);
      if (current) setReading(current.id);
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [entries]);

  return (
    <nav aria-label={label}>
      <p className="text-label text-text-muted">{label}</p>
      <ol className="mt-3 ml-2">
        {entries.map((entry, index) => {
          const active = entry.id === reading;
          const isFirst = index === 0;
          const isLast = index === entries.length - 1;
          return (
            <li key={entry.id} className="relative">
              {entries.length > 1 && (
                // The axis runs from the first dot to the last one, like a route between its end stops.
                <span
                  aria-hidden="true"
                  className={`absolute left-0 border-l border-border ${isFirst ? "top-5.5" : "top-0"} ${
                    isLast ? "h-5.5" : "bottom-0"
                  }`}
                />
              )}
              <a
                href={`#${entry.id}`}
                aria-current={active ? "location" : undefined}
                onClick={() => setReading(entry.id)}
                className={`group flex min-h-11 items-start gap-2 py-3 pl-6 text-body-sm text-text-muted transition-colors duration-150 ease-out hover:text-text ${
                  active ? "lg:text-text" : ""
                }`}
              >
                <span aria-hidden="true" className="absolute top-3 left-0 flex h-5 -translate-x-1/2 items-center">
                  <span
                    className={`size-3 scale-75 rounded-full bg-border-strong transition-[background-color,scale,box-shadow] duration-300 ease-out group-hover:bg-primary ${
                      active ? "lg:scale-100 lg:bg-primary lg:ring-4 lg:ring-primary/25" : ""
                    }`}
                  />
                </span>
                <span className={`shrink-0 tabular-nums ${active ? "lg:text-primary" : ""}`}>{entry.number}.</span>
                {entry.title}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
