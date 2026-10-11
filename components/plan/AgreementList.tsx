import { Handshake, Pencil } from "lucide-react";
import { settleConflicts } from "@/lib/mediation";
import type { Messages } from "@/lib/messages";
import type { PlanDraft } from "@/lib/plan-draft";
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
    <section aria-labelledby="agreements-title" className="rounded-2xl border border-border bg-surface px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <h2 id="agreements-title" className="flex items-center gap-2 text-label-lg text-text">
          <Handshake className="size-5 shrink-0 text-primary" aria-hidden="true" />
          {copy.title}
        </h2>
        <button
          type="button"
          onClick={onChange}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm text-label text-primary underline-offset-4 hover:underline"
        >
          <Pencil className="size-4" aria-hidden="true" />
          {copy.change}
        </button>
      </div>
      <dl className="divide-y divide-border border-t border-border">
        {settled.map(({ conflict, option }) => (
          <div key={conflict.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
            <dt className="text-body-sm text-text-muted">{clashName(conflict, text)}</dt>
            <dd className="text-label text-text">{optionCopy(conflict, option.key, text).title}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
