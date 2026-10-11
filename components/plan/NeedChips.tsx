import type { ReactNode } from "react";
import type { Messages } from "@/lib/messages";
import { type Member, type NeedKey, fillTemplate, listCustomNeeds, NEED_KEYS, sameText } from "@/lib/plan-draft";

type NeedSummaryProps = {
  members: Member[];
  text: Messages["plan"];
  className?: string;
};

const SERVICE_CODES: Partial<Record<NeedKey, string>> = {
  wheelchair: "WCHC",
  noStairs: "WCHS",
  shortWalks: "WCHR",
  halal: "MOML",
  vegetarian: "VLML",
  vegan: "VGML",
};

const CHIP =
  "inline-flex max-w-full items-center gap-2 rounded-2xl border border-border bg-surface px-2 py-1 text-caption font-bold text-text";

/** One need as a small tag, led by its airline service code when it has one. */
export function NeedChip({ need, text, children }: { need: NeedKey; text: Messages["plan"]; children?: ReactNode }) {
  return (
    <span className={CHIP}>
      {SERVICE_CODES[need] && (
        <span aria-hidden="true" className="tracking-wider text-primary">
          {SERVICE_CODES[need]}
        </span>
      )}
      {text.needs[need]}
      {children}
    </span>
  );
}

export function NeedSummary({ members, text, className = "" }: NeedSummaryProps) {
  const counted = NEED_KEYS.map((need) => ({
    need,
    count: members.filter((member) => member.needs.includes(need)).length,
  })).filter((entry) => entry.count > 0);
  const allergic = members.filter((member) => member.allergies.trim() !== "").length;
  const typed = listCustomNeeds(members).map((need) => ({
    need,
    count: members.filter((member) => member.customNeeds.some((entry) => sameText(entry, need))).length,
  }));
  if (counted.length === 0 && typed.length === 0 && allergic === 0) return null;

  return (
    <ul className={`flex flex-wrap gap-1 ${className}`}>
      {counted.map(({ need, count }) => (
        <li key={need} className="max-w-full">
          <NeedChip need={need} text={text}>
            <span className="text-text-muted tabular-nums">{fillTemplate(text.ticket.times, { count })}</span>
          </NeedChip>
        </li>
      ))}
      {typed.map(({ need, count }) => (
        <li key={need} className={CHIP}>
          <span className="min-w-0 wrap-anywhere">{need}</span>
          <span className="text-text-muted tabular-nums">{fillTemplate(text.ticket.times, { count })}</span>
        </li>
      ))}
      {allergic > 0 && (
        <li className={CHIP}>
          {text.pass.allergies}
          <span className="text-text-muted tabular-nums">{fillTemplate(text.ticket.times, { count: allergic })}</span>
        </li>
      )}
    </ul>
  );
}
