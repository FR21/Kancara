import type { ReactNode } from "react";
import type { Messages } from "@/lib/messages";
import { type Member, type NeedKey, fillTemplate, listCustomNeeds, NEED_KEYS, sameText } from "@/lib/plan-draft";
import { BADGE } from "@/components/ui/styles";

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

/** A need as a small tag. Also used for needs typed by hand, which have no service code. */
export const NEED_CHIP = `${BADGE} border border-border bg-surface text-text`;

/** One need as a small tag, led by its airline service code when it has one. */
export function NeedChip({ need, text, children }: { need: NeedKey; text: Messages["plan"]; children?: ReactNode }) {
  return (
    <span className={NEED_CHIP}>
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
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {counted.map(({ need, count }) => (
        <li key={need} className="max-w-full">
          <NeedChip need={need} text={text}>
            <span className="text-text-muted tabular-nums">{fillTemplate(text.ticket.times, { count })}</span>
          </NeedChip>
        </li>
      ))}
      {typed.map(({ need, count }) => (
        <li key={need} className={NEED_CHIP}>
          <span className="min-w-0 wrap-anywhere">{need}</span>
          <span className="text-text-muted tabular-nums">{fillTemplate(text.ticket.times, { count })}</span>
        </li>
      ))}
      {allergic > 0 && (
        <li className={NEED_CHIP}>
          {text.pass.allergies}
          <span className="text-text-muted tabular-nums">{fillTemplate(text.ticket.times, { count: allergic })}</span>
        </li>
      )}
    </ul>
  );
}
