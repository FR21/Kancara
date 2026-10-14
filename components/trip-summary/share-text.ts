import type { Messages } from "@/lib/messages";
import { fillTemplate } from "@/lib/plan-draft";

type ShareLines = Messages["tripSummary"]["share"]["lines"];

export type ShareFacts = {
  name: string;
  destination: string;
  dates: string;
  members: string[];
  /** The places visited, already worded with their count, or empty when the trip has no route. */
  places: string;
  link: string;
};

/** The summary as plain text for a chat message. A fact the trip does not have is left out, not shown empty. */
export function shareText(lines: ShareLines, facts: ShareFacts): string {
  const details = [
    fillTemplate(lines.heading, { name: facts.name }),
    facts.destination ? fillTemplate(lines.destination, { destination: facts.destination }) : "",
    facts.dates ? fillTemplate(lines.dates, { dates: facts.dates }) : "",
    facts.members.length > 0 ? fillTemplate(lines.group, { members: facts.members.join(", ") }) : "",
    facts.places ? fillTemplate(lines.places, { places: facts.places }) : "",
  ].filter(Boolean);
  return `${details.join("\n")}\n\n${fillTemplate(lines.link, { link: facts.link })}`;
}
