import { Handshake, Pencil } from "lucide-react";
import { settleConflicts } from "@/lib/mediation";
import type { Messages } from "@/lib/messages";
import type { PlanDraft } from "@/lib/plan-draft";
import { TEXT_LINK } from "@/components/ui/styles";
import { clashName, optionCopy } from "./mediation-text";

type AgreementListProps = {
  draft: PlanDraft;
  text: Messages["plan"];
  onChange: () => void;
};

// What the group agreed on where its wishes clashed, beside the plan those agreements shaped.
export default function AgreementList({ draft, text, onChange }: AgreementListProps) {
  const settled = settleConflicts(draft);
  if (settled.length === 0) return null;
  const copy = text.mediation.summary;

  return (
    <section
      aria-labelledby="agreements-title"
      className="rounded-surface border border-border bg-surface p-surface motion-safe:animate-message-in"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <h2 id="agreements-title" className="flex items-center gap-2 text-h3 text-text">
          <Handshake className="size-5 shrink-0 text-primary" aria-hidden="true" />
          {copy.title}
        </h2>
        <button type="button" onClick={onChange} className={TEXT_LINK}>
          <Pencil className="size-4" aria-hidden="true" />
          {copy.change}
        </button>
      </div>
      <dl className="mt-2 divide-y divide-border border-t border-border">
        {settled.map(({ conflict, option }) => (
          <div key={conflict.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pt-3 not-last:pb-3">
            <dt className="text-body-sm text-text-muted">{clashName(conflict, text)}</dt>
            <dd className="text-label text-text">{optionCopy(conflict, option.key, text).title}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
